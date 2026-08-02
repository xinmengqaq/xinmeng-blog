insert into category (id, name, description, sort_order, status, created_at, updated_at) values
    (1, '技术', '技术分类', 1, 'visible', timestamp with time zone '2026-07-09 09:00:00+08:00', timestamp with time zone '2026-07-09 09:00:00+08:00'),
    (2, '生活', '生活分类', 2, 'visible', timestamp with time zone '2026-07-09 09:00:00+08:00', timestamp with time zone '2026-07-09 09:00:00+08:00');

insert into tag (id, name, created_at, updated_at) values
    (1, 'Spring', timestamp with time zone '2026-07-09 09:00:00+08:00', timestamp with time zone '2026-07-09 09:00:00+08:00'),
    (2, 'MyBatis', timestamp with time zone '2026-07-09 09:00:00+08:00', timestamp with time zone '2026-07-09 09:00:00+08:00'),
    (3, '日常', timestamp with time zone '2026-07-09 09:00:00+08:00', timestamp with time zone '2026-07-09 09:00:00+08:00');

insert into article (
    id, category_id, title, summary, content, cover_url, status,
    is_top, is_recommend, view_count, comment_count,
    published_at, created_at, updated_at
) values
    (1, null, '无摘要草稿', null, '草稿正文', null, 'draft', false, false, 0, 0, null, timestamp with time zone '2026-07-08 09:00:00+08:00', timestamp with time zone '2026-07-08 09:00:00+08:00'),
    (2, 1, '有摘要发布文章', '发布摘要', '发布正文', '/files/cover.png', 'published', true, false, 12, 1, timestamp with time zone '2026-07-08 10:00:00+08:00', timestamp with time zone '2026-07-08 09:30:00+08:00', timestamp with time zone '2026-07-08 10:00:00+08:00'),
    (3, 2, '生活草稿', '生活摘要', '生活正文', null, 'draft', false, true, 3, 0, null, timestamp with time zone '2026-07-08 11:00:00+08:00', timestamp with time zone '2026-07-08 11:00:00+08:00'),
    (4, 1, '技术隐藏文章', '隐藏摘要', '隐藏正文', null, 'hidden', false, false, 1, 0, null, timestamp with time zone '2026-07-08 12:00:00+08:00', timestamp with time zone '2026-07-08 12:00:00+08:00');

insert into article_tag (article_id, tag_id) values
    (2, 1),
    (2, 2),
    (3, 3),
    (4, 2);

alter table article alter column id restart with 100;
alter table category alter column id restart with 100;
alter table tag alter column id restart with 100;
