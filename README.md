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