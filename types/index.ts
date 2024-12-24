export interface Article {
  url: string
  title: string
  content: string
}

export interface Report {
  title: string
  summary: string
  sections: {
    title: string
    content: string
  }[]
}
