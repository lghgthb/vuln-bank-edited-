# GraphQL 쿼리

이 폴더에는 거래 분석 엔드포인트용 GraphQL 오퍼레이션 예제가 들어 있습니다.

- 엔드포인트: `POST /graphql`
- 인증: `Authorization: Bearer <jwt>`
- 인트로스펙션: 활성화됨

일반 사용자는 자신의 계좌 요약만 조회할 수 있습니다. 관리자는 전체 지표를 조회하거나 `accountNumber`로 특정 계좌를 지정해 조회할 수 있습니다.
