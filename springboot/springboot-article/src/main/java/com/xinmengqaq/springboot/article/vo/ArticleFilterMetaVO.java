package com.xinmengqaq.springboot.article.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArticleFilterMetaVO {

    private List<ArchiveYearVO> archives;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ArchiveYearVO {
        private Integer year;
        private List<ArchiveMonthVO> months;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ArchiveMonthVO {
        private Integer month;
        private Long articleCount;
    }
}
