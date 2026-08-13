import { Pause, Pencil, Play, Trash2 } from 'lucide-react'

import { Button, Menu, Switch } from '@/components/ui'
import type { AdminMusic } from '@/types/music'
import { useAudioPreview } from '@/hooks/useAudioPreview'

import { MusicPagination } from './MusicPagination'
import './adminMusic.css'

type MusicListProps = {
  items: AdminMusic[]
  page: number
  totalPages: number
  total: number
  updatingId: number | null
  onEdit: (music: AdminMusic) => void
  onDelete: (music: AdminMusic) => void
  onToggle: (music: AdminMusic, enabled: boolean) => void
  onPageChange: (page: number) => void
  onPreviewError: (message: string) => void
}

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

export const MusicList = ({
  items,
  page,
  totalPages,
  total,
  updatingId,
  onEdit,
  onDelete,
  onToggle,
  onPageChange,
  onPreviewError,
}: MusicListProps) => {
  const { playingId, stopPreview, togglePreview } =
    useAudioPreview(onPreviewError)

  const changePage = (nextPage: number) => {
    stopPreview()
    onPageChange(nextPage)
  }

  return (
    <div className="music-table-wrap">
      <table className="music-table">
        <thead>
          <tr>
            <th scope="col">音乐</th>
            <th scope="col">时长</th>
            <th scope="col">状态</th>
            <th scope="col">上传时间</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((music) => (
            <tr key={music.id}>
              <td>
                <div className="music-title-cell">
                  <strong>{music.title}</strong>
                  <span>{music.artist || '未填写歌手'}</span>
                </div>
              </td>
              <td className="music-table__numeric">
                {formatDuration(music.duration_ms)}
              </td>
              <td>
                <Switch
                  checked={music.is_enabled}
                  disabled={updatingId === music.id}
                  label={music.is_enabled ? '已启用' : '已停用'}
                  onChange={(enabled) => onToggle(music, enabled)}
                />
              </td>
              <td>{formatDate(music.created_at)}</td>
              <td>
                <div className="music-row-actions">
                  <Button
                    aria-label={
                      playingId === music.id
                        ? `停止试听${music.title}`
                        : `试听${music.title}`
                    }
                    icon={playingId === music.id ? <Pause /> : <Play />}
                    onClick={() => void togglePreview(music)}
                    size="sm"
                    variant="secondary"
                  >
                    {playingId === music.id ? '停止' : '试听'}
                  </Button>
                  <Button
                    icon={<Pencil />}
                    onClick={() => onEdit(music)}
                    size="sm"
                    variant="secondary"
                  >
                    编辑
                  </Button>
                  <Menu
                    label={`${music.title} 更多操作`}
                    items={[
                      {
                        danger: true,
                        icon: <Trash2 />,
                        label: '删除音乐',
                        onSelect: () => onDelete(music),
                      },
                    ]}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <MusicPagination
        page={page}
        total={total}
        totalPages={totalPages}
        onPageChange={changePage}
      />
    </div>
  )
}
