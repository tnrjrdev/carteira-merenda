package com.merenda;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class MerendaApplication {
    public static void main(String[] args) {
        SpringApplication.run(MerendaApplication.class, args);
    }
}
