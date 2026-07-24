export interface SessionItem {
  text: string
  done: boolean
}

export interface SessionSection {
  heading: string
  items: SessionItem[]
}

export interface Session {
  date: string
  title: string
  description?: string
  sections: SessionSection[]
}
