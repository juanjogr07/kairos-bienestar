from collections import defaultdict
from typing import List

_histories: dict[str, List[dict]] = defaultdict(list)
MAX_HISTORY = 10


def get_history(user_id: str) -> List[dict]:
    return _histories[user_id][-MAX_HISTORY:]


def add_message(user_id: str, role: str, content: str) -> None:
    _histories[user_id].append({"role": role, "content": content})


def clear_history(user_id: str) -> None:
    _histories[user_id] = []
