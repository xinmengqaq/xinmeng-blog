from pydantic import BaseModel


class ApiResponse[DataT](BaseModel):
    # 统一响应外壳由 code、message 和承载业务数据的 data 组成。
    # code 是字符串数字，message 中文，data 承载业务数据
    # 所有应用处理的结果 HTTP 状态码统一 200，调用方按 code 判断业务结果
    code: str = "200"
    message: str = "请求成功"
    data: DataT


class HealthCheckData(BaseModel):
    # 健康检查数据模型
    status: str
