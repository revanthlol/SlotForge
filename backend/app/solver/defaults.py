# Soft-constraint default weights/penalties
TEACHER_GAP_PENALTY = 10
DAILY_LOAD_BALANCE_PENALTY = 20
TEACHER_PREFERRED_SLOT_REWARD = 15

DEFAULT_SLOTS = [
    {"id": f"{day.lower()}-{p}", "day": day, "period": p}
    for day in ["Mon", "Tue", "Wed", "Thu", "Fri"]
    for p in range(1, 6)
]

