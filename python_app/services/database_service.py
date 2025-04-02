"""
Database Service Module

This module provides functionality for interacting with the database.
"""

import logging
import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
from pathlib import Path

# Configure logging
logger = logging.getLogger(__name__)

class DatabaseService:
    """
    Service for database operations.
    
    This is a simple implementation that stores data in JSON files.
    In a production environment, this would be replaced with a proper database like MongoDB.
    """
    
    def __init__(self, data_dir: str = "./data"):
        """
        Initialize the DatabaseService.
        
        Args:
            data_dir: Directory to store database files
        """
        self.data_dir = data_dir
        self._ensure_data_dir_exists()
        logger.info(f"Database service initialized with data directory: {data_dir}")
    
    def _ensure_data_dir_exists(self) -> None:
        """Ensure the data directory exists."""
        os.makedirs(self.data_dir, exist_ok=True)
        collections_dir = os.path.join(self.data_dir, "collections")
        os.makedirs(collections_dir, exist_ok=True)
    
    def _get_collection_path(self, collection: str) -> str:
        """
        Get the path to the collection file.
        
        Args:
            collection: Name of the collection
            
        Returns:
            Path to the collection directory
        """
        return os.path.join(self.data_dir, "collections", collection)
    
    def insert_one(self, collection: str, document: Dict[str, Any]) -> Any:
        """
        Insert a document into a collection.
        
        Args:
            collection: Name of the collection
            document: Document to insert
            
        Returns:
            Result of the insertion operation
        """
        collection_dir = self._get_collection_path(collection)
        os.makedirs(collection_dir, exist_ok=True)
        
        # Generate a unique ID for the document
        doc_id = f"{int(datetime.utcnow().timestamp() * 1000)}_{id(document)}"
        
        # Create a new document with the ID
        document_with_id = {**document, "_id": doc_id}
        
        # Save the document as a JSON file
        file_path = os.path.join(collection_dir, f"{doc_id}.json")
        with open(file_path, 'w') as file:
            json.dump(document_with_id, file, indent=2)
        
        # Return a result object with the inserted ID
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        
        return InsertResult(doc_id)
    
    def find_one(self, collection: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Find a document in a collection.
        
        Args:
            collection: Name of the collection
            query: Query to find the document
            
        Returns:
            Found document or None if not found
        """
        collection_dir = self._get_collection_path(collection)
        if not os.path.exists(collection_dir):
            return None
        
        # Simple implementation that loads all documents and filters in memory
        # In a real database, this would use indexing and more efficient querying
        for filename in os.listdir(collection_dir):
            if filename.endswith(".json"):
                file_path = os.path.join(collection_dir, filename)
                with open(file_path, 'r') as file:
                    document = json.load(file)
                    
                    # Check if document matches query
                    match = True
                    for key, value in query.items():
                        if key not in document or document[key] != value:
                            match = False
                            break
                    
                    if match:
                        return document
        
        return None
    
    def find(self, collection: str, query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Find documents in a collection.
        
        Args:
            collection: Name of the collection
            query: Query to find documents (optional)
            
        Returns:
            List of found documents
        """
        collection_dir = self._get_collection_path(collection)
        if not os.path.exists(collection_dir):
            return []
        
        results = []
        
        # Simple implementation that loads all documents and filters in memory
        for filename in os.listdir(collection_dir):
            if filename.endswith(".json"):
                file_path = os.path.join(collection_dir, filename)
                with open(file_path, 'r') as file:
                    document = json.load(file)
                    
                    # If no query or document matches query, add to results
                    if query is None:
                        results.append(document)
                    else:
                        match = True
                        for key, value in query.items():
                            if key not in document or document[key] != value:
                                match = False
                                break
                        
                        if match:
                            results.append(document)
        
        return results