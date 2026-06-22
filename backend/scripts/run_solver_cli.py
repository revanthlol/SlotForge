import sys
import os
import json

# Add backend directory to sys.path to enable app module imports
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from app.solver.models import ProblemInstance
from app.solver.engine import solve

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/run_solver_cli.py <fixture_path>", file=sys.stderr)
        sys.exit(1)
        
    fixture_path = sys.argv[1]
    if not os.path.exists(fixture_path):
        print(f"Error: Fixture file not found at {fixture_path}", file=sys.stderr)
        sys.exit(1)
        
    with open(fixture_path, "r") as f:
        data = json.load(f)
        
    instance = ProblemInstance.model_validate(data)
    result = solve(instance)
    
    print(result.model_dump_json(indent=2))

if __name__ == "__main__":
    main()
