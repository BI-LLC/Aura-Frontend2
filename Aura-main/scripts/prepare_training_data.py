#!/usr/bin/env python3
"""
Prepare training data for fine-tuning LLMs
Week 9-10: Process user data for model personalization
"""

import json
import os
import sys
import argparse
from datetime import datetime
from typing import List, Dict
import re

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def clean_text(text: str) -> str:
    """Clean and normalize text for training"""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove URLs
    text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
    
    # Remove email addresses
    text = re.sub(r'\S+@\S+', '', text)
    
    # Remove special characters but keep punctuation
    text = re.sub(r'[^\w\s\.\,\!\?\-\:\;]', '', text)
    
    return text.strip()

def create_conversation_pairs(documents: List[Dict]) -> List[Dict]:
    """Create Q&A pairs from documents"""
    pairs = []
    
    for doc in documents:
        content = doc.get('content', '')
        
        # Split into sentences
        sentences = re.split(r'[.!?]+', content)
        
        # Create Q&A pairs
        for i, sentence in enumerate(sentences):
            if len(sentence.strip()) < 20:
                continue
            
            # Create a question about this content
            question = f"What information do you have about: {sentence[:50]}...?"
            answer = sentence.strip()
            
            pairs.append({
                "messages": [
                    {"role": "system", "content": "You are AURA, a helpful AI assistant with personalized knowledge."},
                    {"role": "user", "content": question},
                    {"role": "assistant", "content": answer}
                ]
            })
    
    return pairs

def prepare_openai_format(user_id: str, documents: List[Dict]) -> List[Dict]:
    """Prepare data in OpenAI fine-tuning format"""
    training_data = []
    
    # Add system message with user context
    system_message = f"You are AURA, an AI assistant personalized for user {user_id}. "
    system_message += "Use the knowledge from their documents to provide relevant responses."
    
    # Create training examples
    for doc in documents:
        # Extract key information
        filename = doc.get('filename', 'document')
        content = clean_text(doc.get('content', ''))
        
        if len(content) < 50:
            continue
        
        # Create training example
        example = {
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Tell me about {filename}"},
                {"role": "assistant", "content": content[:500]}  # Limit length
            ]
        }
        training_data.append(example)
    
    # Add conversation pairs
    pairs = create_conversation_pairs(documents)
    training_data.extend(pairs[:100])  # Limit to 100 pairs
    
    return training_data

def prepare_grok_format(user_id: str, documents: List[Dict]) -> List[Dict]:
    """Prepare data in Grok fine-tuning format"""
    # Similar to OpenAI but may have different requirements
    # For now, using same format
    return prepare_openai_format(user_id, documents)

def load_user_documents(user_id: str, data_dir: str = "backend/data/knowledge_base") -> List[Dict]:
    """Load all documents for a user"""
    documents = []
    
    # Read all JSON files in knowledge base
    for filename in os.listdir(data_dir):
        if not filename.endswith('.json'):
            continue
        
        filepath = os.path.join(data_dir, filename)
        
        try:
            with open(filepath, 'r') as f:
                doc_data = json.load(f)
                
                # Check if document belongs to user
                if doc_data.get('user_id') == user_id:
                    documents.append(doc_data)
        
        except Exception as e:
            print(f"Error loading {filename}: {e}")
    
    return documents

def validate_training_data(training_data: List[Dict]) -> bool:
    """Validate training data format"""
    if not training_data:
        print("❌ No training data generated")
        return False
    
    for i, example in enumerate(training_data):
        if 'messages' not in example:
            print(f"❌ Example {i} missing 'messages' field")
            return False
        
        messages = example['messages']
        
        if len(messages) < 2:
            print(f"❌ Example {i} has insufficient messages")
            return False
        
        for msg in messages:
            if 'role' not in msg or 'content' not in msg:
                print(f"❌ Example {i} has invalid message format")
                return False
    
    print(f"✅ Validated {len(training_data)} training examples")
    return True

def main():
    """Main function to prepare training data"""
    parser = argparse.ArgumentParser(description='Prepare training data for AURA')
    parser.add_argument('--user-id', required=True, help='User ID to prepare data for')
    parser.add_argument('--format', choices=['openai', 'grok', 'both'], default='both', 
                       help='Output format for training data')
    parser.add_argument('--output-dir', default='backend/app/data', 
                       help='Output directory for training files')
    
    args = parser.parse_args()
    
    print(f"🚀 Preparing training data for user: {args.user_id}")
    
    # Load user documents
    documents = load_user_documents(args.user_id)
    
    if not documents:
        print(f"❌ No documents found for user {args.user_id}")
        return
    
    print(f"📚 Found {len(documents)} documents")
    
    # Prepare training data
    if args.format in ['openai', 'both']:
        print("\n📝 Preparing OpenAI format...")
        openai_data = prepare_openai_format(args.user_id, documents)
        
        if validate_training_data(openai_data):
            # Save to file
            output_file = os.path.join(args.output_dir, f'training_{args.user_id}_openai.jsonl')
            
            with open(output_file, 'w') as f:
                for example in openai_data:
                    f.write(json.dumps(example) + '\n')
            
            print(f"✅ Saved OpenAI training data to: {output_file}")
            print(f"   Examples: {len(openai_data)}")
    
    if args.format in ['grok', 'both']:
        print("\n📝 Preparing Grok format...")
        grok_data = prepare_grok_format(args.user_id, documents)
        
        if validate_training_data(grok_data):
            # Save to file
            output_file = os.path.join(args.output_dir, f'training_{args.user_id}_grok.jsonl')
            
            with open(output_file, 'w') as f:
                for example in grok_data:
                    f.write(json.dumps(example) + '\n')
            
            print(f"✅ Saved Grok training data to: {output_file}")
            print(f"   Examples: {len(grok_data)}")
    
    print("\n🎉 Training data preparation complete!")
    print("\nNext steps:")
    print("1. Review the generated training files")
    print("2. Upload to respective fine-tuning services")
    print("3. Start fine-tuning job")
    print("4. Update model endpoints when ready")

if __name__ == "__main__":
    main()