import re


USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 30
USERNAME_PATTERN = re.compile(r'^[A-Za-z0-9_-]+$')


def username_validation_error(username):
    if not isinstance(username, str):
        return '사용자 이름을 입력해 주세요'

    if not USERNAME_MIN_LENGTH <= len(username) <= USERNAME_MAX_LENGTH:
        return (
            f'사용자 이름은 {USERNAME_MIN_LENGTH}자 이상 '
            f'{USERNAME_MAX_LENGTH}자 이하여야 합니다'
        )

    if not USERNAME_PATTERN.fullmatch(username):
        return '사용자 이름에는 영문, 숫자, 밑줄(_), 하이픈(-)만 사용할 수 있습니다'

    return None
