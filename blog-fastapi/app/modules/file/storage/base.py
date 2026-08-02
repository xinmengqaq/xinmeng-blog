from abc import ABC, abstractmethod


class StorageBackend(ABC):
    # 抽象基类定义不同存储后端共享的保存契约。
    # 路由依赖抽象而不是具体实现，便于替换后端和编写隔离测试。
    # 明确要求实现类继承该基类时，ABC 比只描述结构的 Protocol 更直接。

    @abstractmethod
    async def save(self, data: bytes, filename: str) -> str:
        # 存储后端接收 bytes 和文件名，完成持久化后返回可访问地址。
        # 使用基础类型可以让存储层独立于 FastAPI 的 UploadFile 类型。
        # 异步契约可由具体实现接入异步文件库或线程池，而不绑定某个 I/O 库。
        ...

    @abstractmethod
    async def delete(self, file_url: str) -> bool:
        # 按 file_url 删除文件；不是本后端管理的地址则不操作并返回 False。
        # 返回是否实际删除；删除失败抛异常，由调用方决定记日志或转换错误响应。
        ...

    def owns(self, file_url: str) -> bool:
        # 默认不认领任何地址，具体后端按自己的存储根覆盖，避免外部地址误删。
        return False
