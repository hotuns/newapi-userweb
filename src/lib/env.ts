export function getNewApiBaseUrl() {
  return process.env.NEWAPI_BASE_URL || 'http://localhost:3000'
}
