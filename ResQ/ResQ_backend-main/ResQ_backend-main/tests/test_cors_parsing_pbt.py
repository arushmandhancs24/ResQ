from hypothesis import given, settings, strategies as st
from app.main import parse_allowed_origins

@settings(max_examples=200)
@given(
    origins=st.lists(
        st.from_regex(r'https?://[a-z0-9.-]+', fullmatch=True), 
        min_size=1, 
        max_size=10
    ),
    spaces=st.lists(st.sampled_from([" ", "\t", "\n", "  "]), min_size=1, max_size=20)
)
def test_cors_origin_list_parsing(origins, spaces):
    """
    Property 8: CORS origin list parsing — for any non-empty comma-separated 
    string of origin values with arbitrary surrounding whitespace, the parser 
    SHALL produce a list whose elements are exactly the trimmed origin strings 
    in order with no empty entries.
    """
    import random
    
    # Construct a raw string by joining origins with commas, and randomly injecting spaces around commas
    raw_parts = []
    for origin in origins:
        prefix = random.choice(spaces) if random.random() > 0.5 else ""
        suffix = random.choice(spaces) if random.random() > 0.5 else ""
        raw_parts.append(f"{prefix}{origin}{suffix}")
        
    raw_string = ",".join(raw_parts)
    
    # Optional: inject some completely empty/whitespace-only elements between commas
    if random.random() > 0.5:
        raw_string += "," + random.choice(spaces)
    if random.random() > 0.5:
        raw_string = random.choice(spaces) + "," + raw_string
        
    parsed = parse_allowed_origins(raw_string)
    
    # Assert output matches exactly the cleaned input list
    assert parsed == origins
    
    # Assert no empty entries
    for p in parsed:
        assert p != ""
        assert p.strip() == p
