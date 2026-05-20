import sys
print("Python version:", sys.version)
print("Python path:", sys.path[:3])

try:
    from app.agent.nlp_parser import NLPParser
    print("✓ Successfully imported NLPParser")
    
    parser = NLPParser()
    print("✓ Successfully created NLPParser instance")
    
    result = parser.parse("检测水样中的重金属")
    print("✓ Successfully parsed text")
    print(f"  Sample type: {result.sample_type}")
    print(f"  Confidence: {result.confidence}")
    
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
