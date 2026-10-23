import { describe, expect, test } from "bun:test";
import { LOCALES, messageId, resolveLocale } from "../config";
import { catalogs, createTranslator } from "../translate";

describe("interface translations", () => {
	test("every language covers the English catalog with matching placeholders", () => {
		const keys = Object.keys(catalogs.en).sort();
		expect(keys.length).toBeGreaterThan(1000);
		for (const locale of LOCALES) {
			expect(Object.keys(catalogs[locale]).sort()).toEqual(keys);
			for (const key of keys) {
				const source = catalogs.en[key];
				expect(messageId(source)).toBe(key);
				expect(catalogs[locale][key].trim().length).toBeGreaterThan(0);
				const placeholders = (text: string) =>
					[...text.matchAll(/\{v\d+\}/g)].map((m) => m[0]).sort();
				expect(placeholders(catalogs[locale][key])).toEqual(
					placeholders(source),
				);
			}
		}
	});

	test("translates UI labels and keeps filenames and user text intact", () => {
		const pt = createTranslator("pt-BR");
		const zh = createTranslator("zh-CN");
		expect(pt("Settings")).toBe("Configurações");
		expect(zh("Settings")).toBe("设置");
		expect(pt("Failed to process {v0}", { v0: "我的视频.mp4" })).toBe(
			"Falha ao processar 我的视频.mp4",
		);
		expect(zh("Delete {v0} items", { v0: 3 })).toBe("删除 3 项");
		expect(pt("  My custom project  ")).toBe("  My custom project  ");
		expect(pt(undefined)).toBeUndefined();
	});

	test("translates status/error messages interpolated by editor services", () => {
		expect(createTranslator("pt-BR")("Loading Tiny model...")).toBe(
			"Carregando modelo Tiny...",
		);
		expect(createTranslator("zh-CN")("Failed to process example.mp4")).toBe(
			"无法处理 example.mp4",
		);
		expect(createTranslator("en")("Settings")).toBe("Settings");
	});

	test("rejects unsupported locale values", () => {
		expect(resolveLocale("zh-CN")).toBe("zh-CN");
		expect(resolveLocale("invalid")).toBe("pt-BR");
		expect(resolveLocale(undefined)).toBe("pt-BR");
	});
});
