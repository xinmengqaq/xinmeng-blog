package com.xinmengqaq.springboot.admin.config;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.Stroke;

public final class AdminCaptchaConstants {

    public static final String CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    public static final int CODE_LENGTH = 4;
    public static final int IMAGE_WIDTH = 200;
    public static final int IMAGE_HEIGHT = 80;
    public static final int FONT_SIZE = 32;
    public static final Color BACKGROUND_COLOR = Color.YELLOW;
    public static final Stroke STROKE = new BasicStroke(2.0f);
    public static final Font FONT = new Font(Font.SANS_SERIF, Font.BOLD, FONT_SIZE);

    private AdminCaptchaConstants() {
    }
}
