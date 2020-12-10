export interface OwllyData {
  author: string;
  published: Date;
  title: string;
  link: string;
  level: string;
  goals: any;
  organisation: string;
  text: string;
  type: string;
  ruleValue: string;
  ruleName: string;
  campaignerEmail: string;
  campaignerName: string;
  slug: string;
}

export interface Owlly {
  id: string;
  data: OwllyData;
}
