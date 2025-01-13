export interface Article {
  url: string
  title: string
  content: string
}

export interface Source {
  id: string
  url: string
  name: string
}

export interface Report {
  title: string
  summary: string
  sources: Source[]
  sections: {
    title: string
    content: string
  }[]
}
