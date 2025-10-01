# Intelligent Chunk Processor for AURA Voice AI RAG Pipeline
# Splits documents into semantically meaningful chunks while preserving context

import re
import logging
from typing import List, Dict, Optional, Any
import tiktoken
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class DocumentChunk:
    """Represents a processed document chunk"""
    text: str
    chunk_index: int
    token_count: int
    metadata: Dict[str, Any]
    chunk_type: str
    start_char: int
    end_char: int

class ChunkProcessor:
    def __init__(self):
        """Initialize chunk processor with optimal settings"""
        try:
            self.encoding = tiktoken.get_encoding("cl100k_base")  # GPT-4 encoding
        except Exception as e:
            logger.warning(f"Failed to load tiktoken encoding: {e}")
            self.encoding = None
            
        # Chunk size parameters (optimized for embeddings and LLM context)
        self.max_chunk_tokens = 500    # Optimal for embeddings
        self.overlap_tokens = 50       # Overlap between chunks
        self.min_chunk_tokens = 50     # Minimum viable chunk size
        
        # Text processing patterns
        self.sentence_endings = re.compile(r'[.!?]+\s+')
        self.paragraph_breaks = re.compile(r'\n\s*\n')
        self.header_pattern = re.compile(r'^#{1,6}\s+.*$', re.MULTILINE)
        self.list_pattern = re.compile(r'^\s*[-*+•]\s+.*$', re.MULTILINE)
        
        logger.info("Chunk Processor initialized - Max tokens: {}, Overlap: {}".format(
            self.max_chunk_tokens, self.overlap_tokens
        ))
    
    def smart_chunk_document(
        self, 
        text: str, 
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[DocumentChunk]:
        """
        Intelligently chunk a document while preserving semantic meaning
        
        Args:
            text: Document text to chunk
            metadata: Optional metadata to include in chunks
            
        Returns:
            List of DocumentChunk objects
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for chunking")
            return []
        
        # Clean and normalize text
        clean_text = self._clean_text(text)
        
        # Determine chunking strategy based on document structure
        chunk_strategy = self._determine_strategy(clean_text)
        
        # Apply appropriate chunking method
        if chunk_strategy == "structured":
            raw_chunks = self._chunk_by_structure(clean_text)
        elif chunk_strategy == "conversational":
            raw_chunks = self._chunk_by_dialogue(clean_text)
        else:
            raw_chunks = self._chunk_by_sentences(clean_text)
        
        # Process raw chunks into DocumentChunk objects
        processed_chunks = []
        for i, chunk_data in enumerate(raw_chunks):
            if isinstance(chunk_data, dict):
                chunk_text = chunk_data['text']
                chunk_metadata = {**(metadata or {}), **chunk_data.get('metadata', {})}
                start_char = chunk_data.get('start_char', 0)
                end_char = chunk_data.get('end_char', len(chunk_text))
            else:
                chunk_text = chunk_data
                chunk_metadata = metadata or {}
                start_char = 0
                end_char = len(chunk_text)
            
            # Skip chunks that are too small
            if self._count_tokens(chunk_text) < self.min_chunk_tokens:
                continue
            
            chunk = DocumentChunk(
                text=chunk_text.strip(),
                chunk_index=i,
                token_count=self._count_tokens(chunk_text),
                metadata=chunk_metadata,
                chunk_type=self._identify_chunk_type(chunk_text),
                start_char=start_char,
                end_char=end_char
            )
            processed_chunks.append(chunk)
        
        logger.info(f"Created {len(processed_chunks)} chunks from {len(clean_text)} characters")
        return processed_chunks
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text for better chunking"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Normalize line breaks
        text = re.sub(r'\r\n|\r|\n', '\n', text)
        
        # Remove excessive punctuation
        text = re.sub(r'[.]{3,}', '...', text)
        text = re.sub(r'[-]{3,}', '---', text)
        
        # Clean up quotes (properly escape special characters)
        text = re.sub(r'["""]', '"', text)
        text = re.sub(r"[''']", "'", text)
        
        return text.strip()
    
    def _determine_strategy(self, text: str) -> str:
        """Determine the best chunking strategy based on document structure"""
        # Count structural elements
        header_count = len(self.header_pattern.findall(text))
        list_count = len(self.list_pattern.findall(text))
        paragraph_count = len(self.paragraph_breaks.findall(text))
        
        # Look for conversational patterns
        qa_patterns = len(re.findall(r'[QA]:\s*', text, re.IGNORECASE))
        dialogue_patterns = len(re.findall(r'^\s*[A-Z][a-z]+:\s+', text, re.MULTILINE))
        
        # Decision logic
        if qa_patterns > 3 or dialogue_patterns > 5:
            return "conversational"
        elif header_count > 2 or list_count > 5:
            return "structured"
        else:
            return "semantic"
    
    def _chunk_by_structure(self, text: str) -> List[Dict[str, Any]]:
        """Chunk structured documents by headers and sections"""
        chunks = []
        
        # Split by headers first
        sections = self.header_pattern.split(text)
        
        current_position = 0
        for section_text in sections:
            if not section_text.strip():
                current_position += len(section_text)
                continue
            
            # Check if section fits in one chunk
            if self._count_tokens(section_text) <= self.max_chunk_tokens:
                chunks.append({
                    'text': section_text.strip(),
                    'metadata': {'chunk_method': 'structural'},
                    'start_char': current_position,
                    'end_char': current_position + len(section_text)
                })
            else:
                # Sub-chunk large sections
                sub_chunks = self._chunk_by_sentences(section_text)
                for sub_chunk in sub_chunks:
                    if isinstance(sub_chunk, str):
                        chunks.append({
                            'text': sub_chunk,
                            'metadata': {'chunk_method': 'structural_subdivided'},
                            'start_char': current_position,
                            'end_char': current_position + len(sub_chunk)
                        })
                    else:
                        chunks.append(sub_chunk)
            
            current_position += len(section_text)
        
        return chunks
    
    def _chunk_by_dialogue(self, text: str) -> List[Dict[str, Any]]:
        """Chunk conversational text preserving Q&A structure"""
        chunks = []
        
        # Find Q&A or dialogue patterns
        qa_matches = list(re.finditer(r'[QA]:\s*([^QA]*?)(?=[QA]:|$)', text, re.IGNORECASE | re.DOTALL))
        
        if qa_matches:
            # Group Q&A pairs together
            current_chunk = ""
            current_tokens = 0
            current_position = 0
            
            for match in qa_matches:
                qa_text = match.group(0).strip()
                qa_tokens = self._count_tokens(qa_text)
                
                if current_tokens + qa_tokens <= self.max_chunk_tokens:
                    current_chunk += "\n\n" + qa_text if current_chunk else qa_text
                    current_tokens += qa_tokens
                else:
                    # Save current chunk
                    if current_chunk:
                        chunks.append({
                            'text': current_chunk,
                            'metadata': {'chunk_method': 'dialogue'},
                            'start_char': current_position,
                            'end_char': current_position + len(current_chunk)
                        })
                    
                    # Start new chunk
                    current_chunk = qa_text
                    current_tokens = qa_tokens
                    current_position = match.start()
            
            # Add final chunk
            if current_chunk:
                chunks.append({
                    'text': current_chunk,
                    'metadata': {'chunk_method': 'dialogue'},
                    'start_char': current_position,
                    'end_char': current_position + len(current_chunk)
                })
        else:
            # Fallback to sentence chunking
            return self._chunk_by_sentences(text)
        
        return chunks
    
    def _chunk_by_sentences(self, text: str) -> List[str]:
        """Chunk text by sentences with token limit and overlap"""
        sentences = self.sentence_endings.split(text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        chunks = []
        current_chunk = []
        current_tokens = 0
        
        for sentence in sentences:
            sentence_tokens = self._count_tokens(sentence)
            
            # If single sentence exceeds limit, split it further
            if sentence_tokens > self.max_chunk_tokens:
                # Save current chunk if it has content
                if current_chunk:
                    chunks.append(' '.join(current_chunk))
                
                # Split long sentence by commas or other punctuation
                sub_parts = re.split(r'[,;]', sentence)
                temp_chunk = []
                temp_tokens = 0
                
                for part in sub_parts:
                    part_tokens = self._count_tokens(part)
                    if temp_tokens + part_tokens <= self.max_chunk_tokens:
                        temp_chunk.append(part.strip())
                        temp_tokens += part_tokens
                    else:
                        if temp_chunk:
                            chunks.append(' '.join(temp_chunk))
                        temp_chunk = [part.strip()]
                        temp_tokens = part_tokens
                
                if temp_chunk:
                    current_chunk = temp_chunk
                    current_tokens = temp_tokens
                else:
                    current_chunk = []
                    current_tokens = 0
                continue
            
            # Check if adding sentence exceeds limit
            if current_tokens + sentence_tokens > self.max_chunk_tokens and current_chunk:
                # Save current chunk
                chunks.append(' '.join(current_chunk))
                
                # Start new chunk with overlap
                overlap_sentences = current_chunk[-2:] if len(current_chunk) > 2 else current_chunk
                current_chunk = overlap_sentences + [sentence]
                current_tokens = self._count_tokens(' '.join(current_chunk))
            else:
                current_chunk.append(sentence)
                current_tokens += sentence_tokens
        
        # Add remaining chunk
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return chunks
    
    def _count_tokens(self, text: str) -> int:
        """Count tokens in text using tiktoken"""
        if not text:
            return 0
            
        if self.encoding:
            try:
                return len(self.encoding.encode(text))
            except Exception as e:
                logger.warning(f"Token counting failed: {e}")
        
        # Fallback to word count approximation
        return len(text.split()) * 1.3  # Rough approximation
    
    def _identify_chunk_type(self, text: str) -> str:
        """Identify the semantic type of content in chunk"""
        text_lower = text.lower()
        
        # Check for different content types
        if re.search(r'^\s*[QA]:\s*', text, re.IGNORECASE):
            return 'qa_pair'
        elif any(word in text_lower for word in ['step', 'process', 'procedure', 'method']):
            return 'process'
        elif any(word in text_lower for word in ['definition', 'means', 'refers to', 'is defined as']):
            return 'definition' 
        elif text.count('?') > 0:
            return 'question'
        elif len(re.findall(r'\b\d+\b', text)) > 3:
            return 'data'
        elif any(word in text_lower for word in ['example', 'instance', 'such as', 'for example']):
            return 'example'
        elif re.search(r'^\s*[-*+•]\s+', text):
            return 'list'
        elif re.search(r'^#{1,6}\s+', text):
            return 'header'
        else:
            return 'general'
    
    def get_chunk_statistics(self, chunks: List[DocumentChunk]) -> Dict[str, Any]:
        """Get statistics about processed chunks"""
        if not chunks:
            return {'total_chunks': 0}
        
        token_counts = [chunk.token_count for chunk in chunks]
        chunk_types = [chunk.chunk_type for chunk in chunks]
        
        # Count chunk types
        type_counts = {}
        for chunk_type in chunk_types:
            type_counts[chunk_type] = type_counts.get(chunk_type, 0) + 1
        
        return {
            'total_chunks': len(chunks),
            'avg_tokens_per_chunk': sum(token_counts) / len(token_counts),
            'min_tokens': min(token_counts),
            'max_tokens': max(token_counts),
            'chunk_types': type_counts,
            'total_tokens': sum(token_counts)
        }

# Global service instance
chunk_processor = ChunkProcessor()

def get_chunk_processor() -> ChunkProcessor:
    """Get the global chunk processor instance"""
    return chunk_processor
