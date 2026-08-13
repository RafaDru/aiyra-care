/** Port: leitura de conteúdo legal (filesystem hoje; CMS ou bucket imutável no futuro). */
export interface LegalContentPort {
  readMarkdown(contentPath: string): Promise<{ content: string; sha256: string }>
  resolveRoot(): string
}
