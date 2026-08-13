import { afterEach, describe, expect, it, vi } from 'vitest'

import { adminRequest } from '@/utils/request'

import {
  createAdminMusic,
  deleteAdminMusic,
  getAdminMusic,
  getAdminMusicPage,
  updateAdminMusic,
} from './music'

vi.mock('@/utils/request', () => ({
  adminRequest: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}))

describe('后台音乐 API', () => {
  afterEach(() => vi.clearAllMocks())

  it('按 FastAPI 契约查询音乐分页和详情', () => {
    // Given 管理员查看第 3 页音乐并打开其中一首详情
    // When 前端请求后台音乐数据
    getAdminMusicPage({ page: 3, page_size: 20 })
    getAdminMusic(7)
    // Then 请求应使用 FastAPI 的后台音乐路径和分页字段
    expect(adminRequest.get).toHaveBeenNthCalledWith(1, '/admin/music/tracks', {
      params: { page: 3, page_size: 20 },
    })
    expect(adminRequest.get).toHaveBeenNthCalledWith(2, '/admin/music/tracks/7')
  })

  it('上传音乐时提交 JSON data 和 MP3 file 两个 multipart 字段', () => {
    // Given 管理员填写歌曲资料并选择 MP3 文件
    const file = new File(['audio'], 'song.mp3', { type: 'audio/mpeg' })
    // When 前端创建音乐
    createAdminMusic({ title: '夜曲', artist: '周杰伦', file })
    // Then 请求应符合 FastAPI Json Form 与 UploadFile 的组合契约
    const [url, body] = vi.mocked(adminRequest.post).mock.calls[0] as [
      string,
      FormData,
    ]
    expect(url).toBe('/admin/music/tracks')
    expect(JSON.parse(String(body.get('data')))).toEqual({
      title: '夜曲',
      artist: '周杰伦',
    })
    expect(body.get('file')).toBe(file)
  })

  it('上传音乐时省略未填写的歌手', () => {
    // Given 管理员只填写歌曲名并选择文件
    const file = new File(['audio'], 'instrumental.mp3', {
      type: 'audio/mpeg',
    })
    // When 前端创建无歌手信息的音乐
    createAdminMusic({ title: '纯音乐', file })
    // Then data 中不应伪造歌手字段
    const body = vi.mocked(adminRequest.post).mock.calls[0]?.[1] as FormData
    expect(JSON.parse(String(body.get('data')))).toEqual({ title: '纯音乐' })
  })

  it('局部修改时用 data 包裹实际变化字段', () => {
    // Given 管理员只停用一首音乐
    // When 前端提交局部修改
    updateAdminMusic(7, { is_enabled: false })
    // Then 请求体应匹配 FastAPI MusicUpdateRequest
    expect(adminRequest.patch).toHaveBeenCalledWith('/admin/music/tracks/7', {
      data: { is_enabled: false },
    })
  })

  it('删除时请求指定音乐资源', () => {
    // Given 管理员确认删除一首音乐
    // When 前端提交删除请求
    deleteAdminMusic(7)
    // Then 请求应删除指定 FastAPI 音乐资源
    expect(adminRequest.delete).toHaveBeenCalledWith('/admin/music/tracks/7')
  })
})
