package com.xinmengqaq.springboot.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.type.classreading.CachingMetadataReaderFactory;
import org.springframework.core.type.classreading.MetadataReader;

import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Swagger文档配置
 */

@Configuration
public class SwaggerConfig {

    private static final String BEARER_AUTH = "bearerAuth";
    private static final String PROJECT_PACKAGE = "com.xinmengqaq.springboot";
    private static final String PROJECT_CLASS_PATTERN = "classpath*:com/xinmengqaq/springboot/**/*.class";

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Spring Boot 4 API接口文档")
                        .version("1.0.0")
                        .description("本文档涵盖了所有模块的接口说明")
                        .contact(new Contact().name("薪梦").url("https://space.bilibili.com/387486338?spm_id_from=333.788.0.0")))
                .components(new Components()
                        .addSecuritySchemes(BEARER_AUTH, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH));
    }

    @Bean
    public OpenApiCustomizer schemaPropertyOrderCustomizer() {
        Map<String, List<String>> propertyOrders = loadPropertyOrders();
        return openApi -> {
            if (openApi.getComponents() == null || openApi.getComponents().getSchemas() == null) {
                return;
            }
            openApi.getComponents().getSchemas().forEach((schemaName, schema) ->
                    reorderProperties(schema, propertyOrders.get(schemaName)));
        };
    }

    private Map<String, List<String>> loadPropertyOrders() {
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        CachingMetadataReaderFactory readerFactory = new CachingMetadataReaderFactory(resolver);
        Map<String, List<String>> propertyOrders = new LinkedHashMap<>();

        try {
            Resource[] resources = resolver.getResources(PROJECT_CLASS_PATTERN);
            for (Resource resource : resources) {
                if (!resource.isReadable()) {
                    continue;
                }
                MetadataReader reader = readerFactory.getMetadataReader(resource);
                String className = reader.getClassMetadata().getClassName();
                if (className.contains("$")) {
                    continue;
                }
                Class<?> clazz = Class.forName(className);
                if (clazz.getPackageName().startsWith(PROJECT_PACKAGE)) {
                    propertyOrders.putIfAbsent(clazz.getSimpleName(), collectFieldNames(clazz));
                }
            }
        } catch (IOException | ClassNotFoundException exception) {
            throw new IllegalStateException("加载 Swagger 字段顺序配置失败", exception);
        }

        return propertyOrders;
    }

    private List<String> collectFieldNames(Class<?> clazz) {
        ArrayDeque<Class<?>> classHierarchy = new ArrayDeque<>();
        Class<?> current = clazz;
        while (current != null && !Object.class.equals(current)) {
            classHierarchy.push(current);
            current = current.getSuperclass();
        }

        List<String> fieldNames = new ArrayList<>();
        while (!classHierarchy.isEmpty()) {
            for (Field field : classHierarchy.pop().getDeclaredFields()) {
                int modifiers = field.getModifiers();
                if (field.isSynthetic() || Modifier.isStatic(modifiers) || Modifier.isTransient(modifiers)) {
                    continue;
                }
                fieldNames.add(field.getName());
            }
        }
        return fieldNames;
    }

    private void reorderProperties(Schema<?> schema, List<String> fieldNames) {
        if (schema == null || schema.getProperties() == null || fieldNames == null || fieldNames.isEmpty()) {
            return;
        }

        Map<String, Schema> properties = schema.getProperties();
        Map<String, Schema> orderedProperties = new LinkedHashMap<>();
        for (String fieldName : fieldNames) {
            if (properties.containsKey(fieldName)) {
                orderedProperties.put(fieldName, properties.get(fieldName));
            }
        }
        properties.forEach(orderedProperties::putIfAbsent);
        schema.setProperties(orderedProperties);
    }

}
