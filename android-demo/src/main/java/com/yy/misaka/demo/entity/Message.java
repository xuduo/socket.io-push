package com.yy.misaka.demo.entity;

public class Message {

    private String message;
    private String nickName;
    private Integer color;

    public String getMessage() {
        return message;
    }

    public String getNickName() {
        return nickName;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setNickName(String nickName) {
        this.nickName = nickName;
    }

    public Integer getColor() {
        return color;
    }

    public void setColor(Integer color) {
        this.color = color;
    }
}
