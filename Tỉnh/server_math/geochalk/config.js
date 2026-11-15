/**
 * ==============================================================================
 * GEOCHALK FRONTEND CONFIGURATION
 * ==============================================================================
 * Cấu hình địa chỉ máy chủ API cho GeoChalk Frontend:
 * - Khi chạy chung Nginx với Math Hub: GEOCHALK_API_URL để '' (tự động theo path hiện tại)
 * - EduShare Backend IP: http://192.168.1.240:5500
 * ==============================================================================
 */
window.GEOCHALK_API_URL = window.GEOCHALK_API_URL || '';
window.EDUSHARE_AUTH_URL = window.EDUSHARE_AUTH_URL || 'http://192.168.1.240:5500/api/login';
