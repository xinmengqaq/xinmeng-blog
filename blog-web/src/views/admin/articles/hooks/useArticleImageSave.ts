import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { getArticleDetail } from '@/api/article'
import {
  cleanupContentImage,
  removeArticleCover,
  uploadArticleCover,
  uploadContentImage,
} from '@/api/file'
import {
  articleQueryKeys,
  useCreateArticleMutation,
  useUpdateArticleMutation,
} from '@/queries/article'

import {
  createArticleSaveCheckpoint,
  saveArticleWithImages,
} from '../articleImageSave'

type SaveInput = Omit<Parameters<typeof saveArticleWithImages>[0], 'checkpoint'>

export const useArticleImageSave = () => {
  const queryClient = useQueryClient()
  const { mutateAsync: createArticle } = useCreateArticleMutation()
  const { mutateAsync: updateArticle } = useUpdateArticleMutation()
  const checkpointRef = useRef(createArticleSaveCheckpoint())
  const pendingRef = useRef(false)
  const [isPending, setIsPending] = useState(false)

  const save = useCallback(
    async (input: SaveInput) => {
      if (pendingRef.current) throw new Error('文章正在保存，请稍候')
      pendingRef.current = true
      setIsPending(true)
      console.info('article-image-save-start')
      try {
        const result = await saveArticleWithImages(
          { ...input, checkpoint: checkpointRef.current },
          {
            cleanupContentImage,
            createArticle,
            getArticle: getArticleDetail,
            removeArticleCover,
            updateArticle: (articleId, payload) =>
              updateArticle({ id: articleId, params: payload }),
            uploadArticleCover,
            uploadContentImage,
          },
        )
        const detailKey = articleQueryKeys.detail(result.articleId)
        await queryClient.cancelQueries({ queryKey: detailKey })
        queryClient.setQueryData(detailKey, result.article)
        await queryClient.invalidateQueries({
          queryKey: articleQueryKeys.pages(),
        })
        checkpointRef.current = createArticleSaveCheckpoint()
        console.info('article-image-save-success')
        return result
      } catch (error) {
        console.info('article-image-save-failure')
        throw error
      } finally {
        pendingRef.current = false
        setIsPending(false)
      }
    },
    [createArticle, queryClient, updateArticle],
  )

  return { isPending, save }
}
