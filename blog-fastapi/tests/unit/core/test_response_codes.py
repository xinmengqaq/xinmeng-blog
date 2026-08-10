from app.core.response_codes import DEFAULT_MESSAGES, ResponseCode


def test_response_codes_match_spring_error_codes_and_default_messages():
    # Given：Spring Boot 对外约定了一组完整的基础错误码和默认中文消息
    expected_codes = {
        "200": "请求成功",
        "400": "参数错误",
        "401": "未登录或 Token 无效",
        "403": "无权限操作",
        "404": "数据不存在",
        "405": "请求方法不支持",
        "406": "请求内容无法接受",
        "408": "请求超时",
        "409": "数据冲突",
        "413": "请求体过大",
        "415": "不支持的媒体类型",
        "422": "请求内容无法处理",
        "429": "请求过于频繁",
        "500": "系统异常",
        "503": "服务暂不可用",
    }

    # When：读取 FastAPI 当前公开的全部基础响应码和默认消息
    actual_codes = {code.value: DEFAULT_MESSAGES[code] for code in ResponseCode}

    # Then：两端集合完全相同，新增、遗漏或消息漂移都会被测试发现
    assert actual_codes == expected_codes
