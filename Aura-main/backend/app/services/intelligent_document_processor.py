"""
Intelligent Document Processor
Automatically converts uploaded documents into training data (Q&A pairs, Logic Notes, Reference Materials)
"""

import logging
import re
from typing import List, Dict, Optional, Tuple
from app.services.training_data_service import get_training_data_service

logger = logging.getLogger(__name__)

class IntelligentDocumentProcessor:
    def __init__(self):
        self.training_service = get_training_data_service()
    
    async def process_uploaded_document(
        self, 
        content: str, 
        filename: str, 
        assistant_key: str, 
        tenant_id: Optional[str] = None
    ) -> Dict:
        """
        Automatically convert uploaded document content into training data
        Returns summary of what was created
        """
        try:
            results = {
                'qa_pairs': 0,
                'logic_notes': 0,
                'reference_materials': 0,
                'errors': []
            }
            
            # 1. Extract Q&A pairs from content
            qa_pairs = self._extract_qa_pairs(content)
            for qa in qa_pairs:
                try:
                    result = await self.training_service.create_qa_pair(
                        prompt=qa['question'],
                        response=qa['answer'],
                        tags=qa.get('tags', []),
                        assistant_key=assistant_key,
                        tenant_id=tenant_id
                    )
                    if result['success']:
                        results['qa_pairs'] += 1
                    else:
                        results['errors'].append(f"Failed to create Q&A: {result.get('error')}")
                except Exception as e:
                    results['errors'].append(f"Q&A creation error: {str(e)}")
            
            # 2. Extract logic notes (company policies, processes, rules)
            logic_notes = self._extract_logic_notes(content, filename)
            for note in logic_notes:
                try:
                    result = await self.training_service.create_logic_note(
                        title=note['title'],
                        content=note['content'],
                        category=note.get('category', 'general'),
                        tags=note.get('tags', []),
                        assistant_key=assistant_key,
                        tenant_id=tenant_id
                    )
                    if result['success']:
                        results['logic_notes'] += 1
                    else:
                        results['errors'].append(f"Failed to create logic note: {result.get('error')}")
                except Exception as e:
                    results['errors'].append(f"Logic note creation error: {str(e)}")
            
            # 3. Create reference material from the full document
            try:
                ref_result = await self.training_service.create_reference_material(
                    title=filename.replace('.txt', '').replace('_', ' ').title(),
                    content=content[:2000],  # Limit content size
                    category='documentation',
                    tags=['uploaded_document'],
                    assistant_key=assistant_key,
                    tenant_id=tenant_id
                )
                if ref_result['success']:
                    results['reference_materials'] += 1
                else:
                    results['errors'].append(f"Failed to create reference material: {ref_result.get('error')}")
            except Exception as e:
                results['errors'].append(f"Reference material creation error: {str(e)}")
            
            logger.info(f"Processed {filename}: {results['qa_pairs']} Q&As, {results['logic_notes']} notes, {results['reference_materials']} references")
            return results
            
        except Exception as e:
            logger.error(f"Error processing document {filename}: {e}")
            return {'qa_pairs': 0, 'logic_notes': 0, 'reference_materials': 0, 'errors': [str(e)]}
    
    def _extract_qa_pairs(self, content: str) -> List[Dict]:
        """Extract Q&A pairs from document content using various patterns"""
        qa_pairs = []
        
        # Pattern 1: Explicit Q: A: format
        qa_pattern1 = re.compile(r'Q:\s*(.+?)\n\s*A:\s*(.+?)(?=\n\s*Q:|$)', re.DOTALL | re.IGNORECASE)
        matches = qa_pattern1.findall(content)
        for q, a in matches:
            qa_pairs.append({
                'question': q.strip(),
                'answer': a.strip(),
                'tags': ['extracted_qa']
            })
        
        # Pattern 2: Question? Answer format
        qa_pattern2 = re.compile(r'(.+?\?)\s*\n\s*(.+?)(?=\n.+?\?|$)', re.DOTALL)
        matches = qa_pattern2.findall(content)
        for q, a in matches:
            if len(q) < 200 and len(a) < 1000:  # Reasonable length limits
                qa_pairs.append({
                    'question': q.strip(),
                    'answer': a.strip(),
                    'tags': ['inferred_qa']
                })
        
        # Pattern 3: "What is X?" followed by explanation
        what_pattern = re.compile(r'(What (?:is|are|does|do).+?\?)\s*\n\s*(.+?)(?=\n(?:What|How|Why|When|Where)|$)', re.DOTALL | re.IGNORECASE)
        matches = what_pattern.findall(content)
        for q, a in matches:
            if len(q) < 200 and len(a) < 1000:
                qa_pairs.append({
                    'question': q.strip(),
                    'answer': a.strip(),
                    'tags': ['what_is']
                })
        
        # Pattern 4: How to X? instructions
        how_pattern = re.compile(r'(How (?:to|do|does|can).+?\?)\s*\n\s*(.+?)(?=\n(?:How|What|Why|When|Where)|$)', re.DOTALL | re.IGNORECASE)
        matches = how_pattern.findall(content)
        for q, a in matches:
            if len(q) < 200 and len(a) < 1000:
                qa_pairs.append({
                    'question': q.strip(),
                    'answer': a.strip(),
                    'tags': ['how_to']
                })
        
        # Remove duplicates
        seen = set()
        unique_pairs = []
        for qa in qa_pairs:
            qa_key = (qa['question'].lower(), qa['answer'].lower()[:100])
            if qa_key not in seen:
                seen.add(qa_key)
                unique_pairs.append(qa)
        
        return unique_pairs[:20]  # Limit to 20 Q&A pairs per document
    
    def _extract_logic_notes(self, content: str, filename: str) -> List[Dict]:
        """Extract business logic, rules, and processes from content"""
        logic_notes = []
        
        # Pattern 1: Section headers with content
        section_pattern = re.compile(r'^([A-Z][A-Z\s&-]+):\s*\n(.+?)(?=\n[A-Z][A-Z\s&-]+:|$)', re.MULTILINE | re.DOTALL)
        matches = section_pattern.findall(content)
        for title, content_block in matches:
            if len(content_block.strip()) > 50:  # Skip very short sections
                logic_notes.append({
                    'title': title.strip(),
                    'content': content_block.strip()[:1500],  # Limit length
                    'category': self._categorize_content(title, content_block),
                    'tags': ['section', 'policy']
                })
        
        # Pattern 2: Numbered lists (procedures/steps)
        numbered_sections = re.findall(r'(\d+\.\s+.+?)(?=\n\d+\.|$)', content, re.DOTALL)
        if len(numbered_sections) > 2:  # If we have a good numbered list
            combined_content = '\n'.join(numbered_sections[:10])
            logic_notes.append({
                'title': f'{filename.replace(".txt", "")} - Procedures',
                'content': combined_content[:1500],
                'category': 'procedures',
                'tags': ['procedures', 'steps']
            })
        
        # Pattern 3: Policy statements (must/should/will/cannot)
        policy_pattern = re.compile(r'(.{0,50}(?:must|should|will|cannot|shall not|required to|policy).{0,200})', re.IGNORECASE)
        policies = policy_pattern.findall(content)
        if len(policies) > 0:
            combined_policies = '\n• '.join(set(policies[:10]))  # Remove duplicates, limit to 10
            logic_notes.append({
                'title': f'{filename.replace(".txt", "")} - Policies',
                'content': f'• {combined_policies}',
                'category': 'policies',
                'tags': ['policy', 'rules']
            })
        
        return logic_notes[:10]  # Limit to 10 logic notes per document
    
    def _categorize_content(self, title: str, content: str) -> str:
        """Categorize content based on title and content patterns"""
        title_lower = title.lower()
        content_lower = content.lower()
        
        if any(word in title_lower for word in ['service', 'offer', 'product', 'pricing']):
            return 'services'
        elif any(word in title_lower for word in ['company', 'about', 'overview', 'background']):
            return 'company_info'
        elif any(word in title_lower for word in ['process', 'procedure', 'step', 'how']):
            return 'procedures'
        elif any(word in title_lower for word in ['contact', 'booking', 'email', 'phone']):
            return 'contact'
        elif any(word in content_lower for word in ['must', 'should', 'policy', 'rule', 'required']):
            return 'policies'
        elif any(word in content_lower for word in ['expertise', 'experience', 'specialization']):
            return 'expertise'
        else:
            return 'general'

# Global instance
intelligent_processor = IntelligentDocumentProcessor()

def get_intelligent_processor() -> IntelligentDocumentProcessor:
    """Get the global intelligent processor instance"""
    return intelligent_processor
