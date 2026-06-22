import json
import os

from app.solver.models import ProblemInstance
from app.solver.engine import solve
from app.solver.scoring import compute_soft_constraint_scores

FIXTURES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "app", "solver", "fixtures"
)

def test_scoring_on_tight_instance():
    """Verify that scoring on a solved sample_tight.json yields values in [0, 100]."""
    path = os.path.join(FIXTURES_DIR, "sample_tight.json")
    with open(path, "r") as f:
        data = json.load(f)
        
    instance = ProblemInstance.model_validate(data)
    result = solve(instance)
    
    assert result.status in ("OPTIMAL", "FEASIBLE")
    
    # Re-compute scoring directly to test the module
    scores = compute_soft_constraint_scores(instance, result.assignments)
    
    for key in ["preference_score", "utilization_score", "gap_score", "overall_score"]:
        assert key in scores
        score_val = scores[key]
        assert isinstance(score_val, int)
        assert 0 <= score_val <= 100, f"Score {key}={score_val} is out of bounds [0, 100]"
        
    # Verify that since preferences are satisfied, preference_score is high (100)
    assert scores["preference_score"] == 100
