// Valores-padrão do formulário de curso, no mesmo espírito de
// src/pages/app/subpages/inscricao/padroes.js — usado para popular o
// react-hook-form na criação (sem pré-existentes) de um novo curso.
export default {
  name: "",
  code: "",
  description: "",
  workload: "",
  minAge: "",
  maxAge: "",
  minSchoolLevel: "",
  contribution: "",
  jobMarket: "",
  apresentationVideoUrl: "",
  image: "",
  type: "",
  isActive: true,
  minBirthDate: "",
  maxBirtDate: "",
  availablePeriods: [],
  subjects: [],
  // Usados no e-mail de confirmação de inscrição (disparado quando o pagamento da taxa é
  // confirmado) — ver src/NsfApi/templates/confirmacao-inscricao/README.md no backend.
  enrollmentPeriodDescription: "",
  classesStartDescription: "",
  installmentsCount: "",
  installmentValue: "",
};
