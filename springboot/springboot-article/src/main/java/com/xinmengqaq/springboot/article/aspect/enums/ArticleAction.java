package com.xinmengqaq.springboot.article.aspect.enums;

/**
 * 文章操作动作枚举。作为行为日志 action 字段的固定取值，
 * label 为中文描述，便于代码阅读；日志 action 字段用枚举名（如 UPDATE_TOP），不用 label。
 */
public enum ArticleAction {
    SAVE_ARTICLE("新增文章"),
    UPDATE_ARTICLE("更新文章"),
    DELETE_ARTICLE("删除文章"),
    BATCH_DELETE_ARTICLE("批量删除文章"),
    UPDATE_STATUS("更新文章状态"),
    UPDATE_TOP("更新置顶状态"),
    UPDATE_RECOMMEND("更新推荐状态"),
    DETAIL_QUERY("文章详情查询"),
    PAGE_QUERY("分页查询");

    private final String label;

    ArticleAction(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
