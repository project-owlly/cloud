export interface OwllyData {
  title: string;
  text: string; //offizieller abstimmungstext
  description: string; // einen "marketing" beschreibung
  goals: string[]; // diverse goals

  link: string; //external link for sharing
  slug: string; //scully

  type: 'initiative' | 'referendum';

  level: 'canton' | 'national'; //delete one of those

  ruleValue: 'sh';

  author: string; // liste von komitee mitgliedern gemäss Volksbegehren
  campaignerEmail: string; //
  campaignerName: string; //
  campaignerRef: any; // aus benutzerprofil

  published: any;
}

export interface Owlly {
  id: string;
  ref: any;

  data: OwllyData;
}
