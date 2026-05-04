// otplib mock for integration tests
// 실제 TOTP 기능은 테스트 대상이 아니므로 stub 처리
module.exports = {
  generateSecret: () => 'MOCK_SECRET',
  generateURI: () => 'otpauth://mock',
  verify: () => false,
  authenticator: {
    generate: () => '000000',
    verify: () => false,
    generateSecret: () => 'MOCK_SECRET',
    keyuri: () => 'otpauth://mock',
  },
};
