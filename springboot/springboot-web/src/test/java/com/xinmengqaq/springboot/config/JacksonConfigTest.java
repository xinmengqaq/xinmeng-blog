package com.xinmengqaq.springboot.config;

import com.xinmengqaq.springboot.article.vo.ArticleVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.MapperFeature;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;

class JacksonConfigTest {

    private final JacksonConfig jacksonConfig = new JacksonConfig();

    @Test
    @DisplayName("JSON 响应字段不按字母排序")
    void testJsonFieldOrderDoesNotUseAlphabeticalSort() throws Exception {
        JsonMapper.Builder builder = JsonMapper.builder()
                .enable(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY);
        jacksonConfig.jsonFieldOrderCustomizer().customize(builder);
        ObjectMapper objectMapper = builder.build();
        ArticleVO articleVO = ArticleVO.builder()
                .id(4L)
                .title("修改文章测试")
                .summary("修改后的摘要")
                .content("这是一篇被修改过的文章。")
                .coverUrl("/files/update.jpg")
                .status("published")
                .isTop(true)
                .isRecommend(false)
                .build();

        String json = objectMapper.writeValueAsString(articleVO);

        assertThat(json.indexOf("\"id\"")).isLessThan(json.indexOf("\"content\""));
        assertThat(json.indexOf("\"title\"")).isLessThan(json.indexOf("\"summary\""));
        assertThat(json.indexOf("\"status\"")).isLessThan(json.indexOf("\"isTop\""));
    }
}
