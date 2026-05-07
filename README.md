Evoluti Fisio
Gestão Clínica Inteligente e Prontuários Integrados
Versão Atual: v1.4.8
Visão Geral do Projeto
O Evoluti Fisio é uma aplicação web completa desenvolvida para solucionar o problema de fragmentação e falta de contexto nos registros de evoluções fisioterapêuticas. Utilizando a metodologia SOAP (Subjetivo, Objetivo, Avaliação, Plano), a plataforma guia o profissional durante o preenchimento, garantindo qualidade e rastreabilidade da informação clínica.
O sistema opera em uma arquitetura Multi-Tenant, isolando ou integrando dados operacionais e financeiros entre diferentes bases clínicas sob uma única interface. O público-alvo central são fisioterapeutas, terapeutas ocupacionais, recepcionistas e gestores de clínicas.
Stack Tecnológica
O projeto foi construído focando em alta reatividade, Clean Architecture e modularização, utilizando:
Frontend: React.js
Estilização: Tailwind CSS (para um design responsivo e fluído)
Ícones: Lucide React
Backend / BaaS: Firebase Firestore (Banco de Dados em Tempo Real e Autenticação)
Arquitetura de Módulos (Design Modular)
A aplicação foi rigorosamente separada por contextos de responsabilidade para aplicar o princípio DRY (Don't Repeat Yourself) e facilitar a depuração (debugging):
App.jsx (Core & Gatekeeper): Motor principal de roteamento, controle de estados de autenticação, injeção de interface (Sidebar/Menu) e serviço de auditoria permanente (Logs de Sistema).
Pacientes.jsx (Prontuário & SOAP): Coração clínico do sistema. Gerencia fichas de pacientes, plano de tratamento dinâmico (Banco Global de Exercícios), controle de consumo de materiais e assinatura digital de evoluções em tempo real.
Agenda.jsx (Scheduling): Calendário inteligente com prevenção de conflitos de sala/profissional. Suporta agendamentos únicos, geração de pacotes em lote e override (sobrescrita) de valores por sessão.
Financeiro.jsx (Business Intelligence): Painel analítico financeiro. Inclui motor de cálculo dinâmico de rendimento por profissional (apenas sessões vs. sessões + insumos) e gestão de estoque multi-clínica.
Equipe.jsx (User Management): Interface de gestão de acessos com proteção nativa contra Privilege Escalation (escalonamento de privilégios).
Segurança e Controle de Acesso (RBAC)
O sistema conta com um controle de acesso baseado em papéis (Role-Based Access Control), garantindo que os dados obedeçam ao princípio do privilégio mínimo:
Recepção: Acesso focado em agendamentos, visualização de estoque e triagem. Valores financeiros globais permanecem censurados.
Clínico (Fisio/TO): Acesso total aos prontuários dos seus pacientes, modulação de condutas e prescrição de exercícios baseada em evidências.
Gestor Clínico: Visão macro da clínica, acesso a métricas de faltas críticas e faturamento diário consolidado.
Super Gestor (God Mode): Acesso de nível raiz (root), hardcoded no sistema e validado pelo registro profissional mestre. Possui autonomia total para auditar logs estruturados permanentes e alterar a hierarquia de qualquer membro da equipe.
Instruções de Deploy e Testes Locais
Para "rodar" a aplicação no seu ambiente de desenvolvimento e validar a estruturação do código, siga os passos abaixo:
1. Instalação de Dependências
Certifique-se de ter o Node.js instalado. No terminal, na raiz do projeto, execute:

Bash


npm install


2. Configuração do Backend (Firebase)
No arquivo src/services/firebaseConfig.js, certifique-se de que as chaves de ambiente do seu projeto Firebase estão corretamente preenchidas. O banco de dados Firestore deve estar com as regras de segurança (Security Rules) configuradas para produção.
3. Inicialização do Servidor de Desenvolvimento
Execute o comando abaixo para iniciar a aplicação:

Bash


npm run dev


Acesse http://localhost:3000 (ou a porta indicada no terminal) para visualizar a interface de login (Split-Screen).
Próximos Passos e Melhorias Contínuas (Backlog)
Mantendo a visão de engenharia e escalabilidade para as próximas sprints, os seguintes recursos estão previstos para futuras atualizações:
Módulo de Arquivos Médicos: Integração com Firebase Storage para upload e vinculação de exames de imagem e laudos em PDF diretamente na ficha do paciente.
Exportação Otimizada: Melhorias no motor de impressão de PDFs para gerar guias de faturamento em padrão TISS/TUSS para convênios.
Predição Clínica (IA): Implementação de análise de dados cruzada para sugerir progressão de carga estruturada baseada no histórico de evolução da Escala de Dor Analógica (EVA).
Documentação gerada pelo Arquiteto de Software.
# Evoluti Fisio

**Gestão Clínica Inteligente e Prontuários Integrados**
**Versão Atual:** v1.8.0

## Visão Geral do Projeto

[cite_start]O Evoluti Fisio é uma aplicação web completa desenvolvida para solucionar o problema de fragmentação e falta de contexto nos registros de evoluções fisioterapêuticas[cite: 939]. [cite_start]Utilizando a metodologia SOAP (Subjetivo, Objetivo, Avaliação, Plano), a plataforma guia o profissional durante o preenchimento, garantindo qualidade e rastreabilidade da informação clínica[cite: 940]. 

[cite_start]O sistema opera em uma arquitetura Multi-Tenant, isolando ou integrando dados operacionais e financeiros entre diferentes bases clínicas sob uma única interface[cite: 941]. [cite_start]A versão v1.8.0 integra monitoramento de performance em tempo real baseado em RUM (Real-User Monitoring) e processamento Serverless de Inteligência Artificial[cite: 81, 1204].

## Stack Tecnológica

O projeto foi construído focando em alta reatividade, *Clean Architecture* e modularização, utilizando:

* [cite_start]**Frontend:** React.js[cite: 943].
* [cite_start]**Estilização:** Tailwind CSS (para um design responsivo e fluído)[cite: 943].
* [cite_start]**Ícones:** Lucide React[cite: 943].
* [cite_start]**Backend / BaaS:** Firebase Firestore (Banco de Dados em Tempo Real e Autenticação)[cite: 943].
* [cite_start]**Serverless & Hosting:** Vercel (API Proxy, Speed Insights)[cite: 81, 1218].

## Arquitetura de Módulos (Design Modular)

A aplicação foi rigorosamente separada por contextos de responsabilidade para aplicar o princípio DRY (*Don't Repeat Yourself*) e facilitar a depuração (*debugging*):

* [cite_start]**App.jsx (Core & Gatekeeper):** Motor principal de roteamento, controle de estados de autenticação, injeção de interface (Sidebar/Menu) e serviço de auditoria permanente (Logs de Sistema)[cite: 944]. [cite_start]Incorpora o filtro Client-Side RLS para a lógica Multi-Tenant, motor de Notificações Push e a telemetria do Vercel Speed Insights[cite: 296, 537, 1226].
* [cite_start]**Pacientes.jsx (Prontuário & SOAP):** Coração clínico do sistema[cite: 945]. [cite_start]Gerencia fichas de pacientes, plano de tratamento dinâmico (Banco Global de Exercícios), controle de consumo de materiais e assinatura digital de evoluções em tempo real[cite: 945]. [cite_start]Possui motor de geração de PDFs para histórico clínico e cobrança[cite: 539].
* [cite_start]**Agenda.jsx (Scheduling):** Calendário inteligente com prevenção de conflitos de sala/profissional[cite: 946]. [cite_start]Suporta agendamentos únicos, geração de pacotes em lote e override (sobrescrita) de valores por sessão[cite: 947].
* [cite_start]**Financeiro.jsx (Business Intelligence):** Painel analítico financeiro[cite: 948]. [cite_start]Inclui motor de cálculo dinâmico de rendimento por profissional (apenas sessões vs. sessões + insumos) e gestão de estoque multi-clínica[cite: 948]. [cite_start]Possui Modo Censurado para proteger dados sensíveis[cite: 541].
* [cite_start]**Equipe.jsx (User Management):** Interface de gestão de acessos com proteção nativa contra Privilege Escalation (escalonamento de privilégios)[cite: 949]. [cite_start]Gerencia métricas de performance individuais e engloba o motor de Disaster Recovery para backup em JSON/CSV[cite: 538].
* [cite_start]**api/gemini.js (Serverless API):** Rota de backend oculto hospedada na Vercel que atua como proxy seguro para o Google Gemini, impedindo o vazamento da chave de API no frontend[cite: 81, 128].

## Segurança e Controle de Acesso (RBAC)

O sistema conta com um controle de acesso baseado em papéis (*Role-Based Access Control*), garantindo que os dados obedeçam ao princípio do privilégio mínimo:

* [cite_start]**Recepção:** Acesso focado em agendamentos, visualização de estoque e triagem[cite: 950]. [cite_start]Valores financeiros globais permanecem censurados[cite: 950]. [cite_start]Tem permissão para lançar insumos em consultas e emitir relatórios individuais de cobrança[cite: 410].
* [cite_start]**Clínico (Fisio/TO):** Acesso total aos prontuários dos seus pacientes, modulação de condutas e prescrição de exercícios baseada em evidências[cite: 951].
* [cite_start]**Gestor Clínico:** Visão macro da clínica, acesso a métricas de faltas críticas e faturamento diário consolidado[cite: 952].
* [cite_start]**Super Gestor (God Mode):** Acesso de nível raiz (root), hardcoded no sistema e validado pelo registro profissional mestre (CREFITO)[cite: 843, 953]. [cite_start]Possui autonomia total para auditar logs estruturados permanentes e alterar a hierarquia de qualquer membro da equipe[cite: 954].

## Instruções de Deploy e Testes Locais

1. [cite_start]**Instalação de Dependências:** Certifique-se de ter o Node.js instalado[cite: 955]. [cite_start]No terminal, na raiz do projeto, instale os pacotes principais e as dependências analíticas (como o `@vercel/speed-insights`)[cite: 1225].
2. [cite_start]**Configuração do Backend (Firebase):** No arquivo `src/services/firebaseConfig.js`, certifique-se de que as chaves de ambiente do seu projeto Firebase estão corretamente preenchidas[cite: 956].
3. [cite_start]**Variáveis de Ambiente (Vercel):** Para que a IA funcione, certifique-se de configurar a variável `GEMINI_API_KEY` na aba *Environment Variables* do painel da Vercel, sem o prefixo `VITE_`[cite: 122].
4. [cite_start]**Inicialização:** Inicie o servidor de desenvolvimento e acesse via navegador para visualizar a interface *Split-Screen*[cite: 958].

## Performance e Telemetria

[cite_start]Este sistema utiliza o **Vercel Speed Insights** (Real-User Monitoring) para avaliar os Core Web Vitals (LCP, INP, CLS, TTFB) diretamente nos navegadores dos usuários[cite: 1204, 1206]. [cite_start]Isso garante detecção imediata de gargalos de interatividade ou atrasos de rede[cite: 1213].