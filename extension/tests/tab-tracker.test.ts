import { extractDomain } from "../src/background/tab-tracker"

describe("extractDomain", () => {
  it("retorna hostname sin www", () => {
    expect(extractDomain("https://www.youtube.com/watch?v=x")).toBe("youtube.com")
    expect(extractDomain("https://x.com/feed")).toBe("x.com")
    expect(extractDomain("https://news.ycombinator.com")).toBe(
      "news.ycombinator.com"
    )
  })

  it("normaliza a lowercase", () => {
    expect(extractDomain("https://YouTube.Com/")).toBe("youtube.com")
  })

  it("ignora esquemas no http/https", () => {
    expect(extractDomain("chrome://extensions")).toBeNull()
    expect(extractDomain("file:///tmp/foo")).toBeNull()
    expect(extractDomain("about:blank")).toBeNull()
  })

  it("ignora URLs inválidas o vacías", () => {
    expect(extractDomain("")).toBeNull()
    expect(extractDomain(null)).toBeNull()
    expect(extractDomain(undefined)).toBeNull()
    expect(extractDomain("not a url")).toBeNull()
  })
})
