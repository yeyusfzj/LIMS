"""
Base model for SQLAlchemy ORM models.

This module provides the declarative base class for all database models.
"""

from sqlalchemy.ext.declarative import declarative_base

# Create the declarative base class
Base = declarative_base()
