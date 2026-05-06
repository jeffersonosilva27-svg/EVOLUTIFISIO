# Evoluti Fisio - Gestão Clínica Inteligente

**Versão Atual:** v1.4.9

## Visão Geral do Projeto
O Evoluti Fisio é uma aplicação web completa desenvolvida para solucionar o problema de fragmentação e falta de contexto nos registros de evoluções fisioterapêuticas e otimizar a gestão da clínica. Utilizando a metodologia SOAP (Subjetivo, Objetivo, Avaliação, Plano), a plataforma guia o profissional durante o preenchimento e centraliza agendamentos, prontuários de pacientes, avaliações científicas e controle financeiro.

O sistema opera de forma segura através de uma arquitetura **Multi-Tenant (Multilocatário)**, permitindo o isolamento ou integração de dados operacionais e financeiros entre diferentes unidades clínicas (ex: Vida e Reabtech) sob uma única plataforma.

## Stack Tecnológica
* **Frontend:** React.js, Tailwind CSS, Lucide React (Ícones)
* **Backend & Banco de Dados:** Firebase (Firestore, Authentication)
* **Inteligência Artificial:** Integração Google Gemini API
* **Hospedagem / Infraestrutura:** Vercel

## Arquitetura e Regras de Segurança
* **Multi-Tenant (Isolamento por Clínica):** O sistema utiliza **Client-Side RLS (Row-Level Security)**. Uma função central (`temAcessoClinica`) intercepta todos os dados buscando "matches" entre o perfil do usuário logado e a clínica do dado/paciente, garantindo a privacidade das informações.
* **Privacy Mode (Censura Financeira):** Dados financeiros exibidos nos painéis ficam ofuscados por padrão (R$ ****), reveláveis através do botão de alternância (EyeOff) para proteger informações contra olhares de terceiros ou perfis não autorizados.
* **Super Gestor (God Mode):** Controle de privilégios mestre baseado em identificador único (CREFITO). Apenas o Super Gestor pode visualizar colunas críticas (como atribuição multi-tenant) ou rebaixar/promover outros gestores.
* **Auditoria (Logs):** Ações críticas (como visualização de prontuários de terceiros ou edição de perfis) são salvas permanentemente em histórico de auditoria.

## Módulos e Descrições de Funções

### 1. Módulo Principal (`src/App.jsx`)
O Cérebro da aplicação que lida com a estrutura macro, segurança e estado global.
* **Controle de Autenticação:** Login e Tela Dividida (Split Screen). Formulário de cadastro de equipe exigindo vinculação da filial.
* **Motor Multi-Tenant Global:** Configuração da filtragem raiz que propaga apenas dados válidos para as outras "views".
* **Self-Service Profile:** O usuário logado pode alterar o próprio e-mail, nome e CREFITO diretamente clicando no avatar.
* **Dashboards Customizados (Roles):**
    * *Super Gestor / Gestor Clínico:* Métricas de cancelamentos, total de faturamentos (censurados) e painel de Logs de Auditoria.
    * *Profissional de Saúde:* Carrossel navegável (7 dias) exibindo os próximos pacientes e condutas programadas para preparação prévia.
    * *Recepção:* Visão focada em chegadas, agendamentos do dia e controle de estoque, sem a exposição do financeiro da empresa.
* **Motor de Notificações (Push):** Gatilhos que alertam o profissional na tela em tempo real quando ocorrem novos agendamentos ou cancelamentos no sistema.
* **Assistente Evo:** Tutorial flutuante passo a passo adaptado à hierarquia da pessoa que está logada.

### 2. Módulo de Pacientes & Prontuário (`src/views/Pacientes.jsx`)
O núcleo do histórico de saúde, focado na metodologia clínica.
* **Atualização em Cascata (Cascade Update):** Ao trocar a clínica a qual um paciente pertence, todos os agendamentos e consumos históricos desse paciente têm seus vínculos atualizados na mesma transação.
* **Evolução SOAP Inteligente:** Botão que "Puxa a Conduta" do dia, inserindo automaticamente os exercícios e cargas pré-programados na caixa de evolução.
* **Integração Automática com Agenda:** Ao assinar digitalmente a evolução, a sessão do paciente do dia na Agenda altera seu status para "Realizado".
* **Banco Global de Condutas (Dumbbell):** Autocompletar inteligente que aprende com as condutas dos profissionais, normalizando termos (Anti-Duplicação) e sugerindo para toda a equipe, mantendo a carga personalizada de forma isolada por paciente.
* **Escalas Clínicas (Dashboards & Estáticas):** Biblioteca de dezenas de escalas padronizadas (ex: TUG, Escala de Berg) embutidas de forma offline no código (Static Data Strategy). Os testes aplicados preenchem cards dinâmicos indicando o status de evolução/declínio em % do paciente.
* **Relatórios (PDF):** Geração de relatórios com cabeçalhos detalhados (Extratos para cobrança via Recepção e Histórico Prontuário Integrado para saúde).

### 3. Módulo de Agenda (`src/views/Agenda.jsx`)
O controle de tempo, com prioridade para ações rápidas.
* **Agendamento em Lote:** Automação de marcação recorrente (ex: selecionar 10 sessões marcando Ter/Qui), pulando fins de semana automaticamente.
* **Override Financeiro (ValorSessao):** Modalidade para definir se o preço de uma sessão específica deve divergir do "Valor Base" registrado na ficha do paciente.
* **Indicadores de Evolução (Bolinhas Piscantes):** * *Verde Piscante:* Paciente atendido e prontuário devidamente evoluído.
    * *Vermelha Piscante:* Sessão já ocorreu, porém o profissional ainda está devendo a evolução.
* **Cancelamento Segmentado:** Cancelamentos são discriminados via Menu (<24h, >24h isento, Falta sem justificativa, Erro) para gerar dados para a Gestão.

### 4. Módulo de Equipe (`src/views/Equipe.jsx`)
A visão de gestão de Recursos Humanos da Clínica.
* **Métricas de Performance Individuais:** Painel que cruza "Sessões Atendidas" vs "Prontuários Assinados", calculando a taxa de engajamento do Fisioterapeuta.
* **Usuários Desativados (Sanfona):** Profissionais inativos deixam a listagem da Agenda e migram para um _Accordion_ retraído no fim da tela.
* **Backup Nuclear:** Botão do gestor que faz a extração sanitizada em `.json` do Firebase de todas as informações estruturadas.
* **Reset de Senha:** Ação de emergência concedida ao gestor para reinicialização de perfis bloqueados de outros colaboradores.

### 5. Módulo Financeiro (`src/views/Financeiro.jsx`)
Ferramenta analítica (BI) para auditoria e controle de caixa.
* **Faturamento Dinâmico (Sessões):** Não requer input manual; a receita totaliza iterando todos os Agendamentos "Realizados" cruzando com o Preço Override ou Preço Base.
* **Detalhamento de Rendimento por Profissional:** Exibe numa tabela classificada (Ranking) a quantidade de sessões de cada terapeuta e a quantia financeira bruta que ele gerou.
* **Privilégio Zero para Recepção:** Restringe abertamente a área de "Resumo Geral", liberando acesso unicamente à sub-aba de Estoque e Consumos do Dia.

## Deploy / Infraestrutura
* Publicado e rodando Serverless na plataforma **Vercel**.
* A Vercel foi configurada para utilizar Hot Reload local no desenvolvimento através do Vite e carregar Variáveis de Ambiente seguras (Env Vars) para a comunicação com integrações Google.