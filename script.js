/* ==========================================================
   QUADRO A QUADRO — script.js
   1. Configuração da API
   2. Estado global
   3. Navegação SPA
   4. Listagem (fetch + async/await)
   5. Cadastro (validação + preventDefault)
   ========================================================== */

/* ----------------------------------------------------------
   1. CONFIGURAÇÃO DA API
   Substitua SUA_CHAVE_AQUI pela sua chave (API Key v3 do TMDB).
   Veja o passo a passo para obtê-la na documentação do projeto.
   ---------------------------------------------------------- */
const API_URL =
  "https://api.themoviedb.org/3/trending/all/week?language=pt-BR&api_key=c072840352357132bf91d357e7ccbb5a";

const IMAGEM_BASE = "https://image.tmdb.org/t/p/w500";

/* ----------------------------------------------------------
   2. ESTADO GLOBAL
   - api: títulos vindos da API
   - cadastrados: títulos inseridos pelo formulário
   - carregado: evita buscar a API de novo sem necessidade
   ---------------------------------------------------------- */
const estado = {
  api: [],
  cadastrados: [],
  carregando: false,
  carregado: false,
  erro: null,
};

/* ----------------------------------------------------------
   3. NAVEGAÇÃO SPA
   Troca a seção visível usando apenas classes CSS.
   ---------------------------------------------------------- */
function trocarSecao(idSecao) {
  document.querySelectorAll(".secao").forEach((secao) => {
    secao.classList.toggle("ativa", secao.id === idSecao);
  });

  document.querySelectorAll(".menu a").forEach((link) => {
    link.classList.toggle("ativo", link.dataset.secao === idSecao);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (idSecao === "listagem" && !estado.carregado && !estado.carregando) {
    carregarTitulos();
  }
}

// Captura cliques nos links de navegação (menu e botões internos)
document.querySelectorAll("[data-secao]").forEach((elemento) => {
  elemento.addEventListener("click", (evento) => {
    evento.preventDefault();
    const destino = elemento.dataset.secao;
    history.replaceState(null, "", `#${destino}`);
    trocarSecao(destino);
  });
});

/* ----------------------------------------------------------
   4. LISTAGEM — consumo da API
   ---------------------------------------------------------- */
async function carregarTitulos() {
  estado.carregando = true;
  estado.erro = null;
  renderizarListagem();

  try {
    if (API_URL.includes("SUA_CHAVE_AQUI")) {
      throw new Error(
        "Chave da API não configurada. Abra script.js e substitua SUA_CHAVE_AQUI pela sua chave."
      );
    }

    const resposta = await fetch(API_URL);
    if (!resposta.ok) {
      throw new Error(`A API respondeu com erro ${resposta.status}. Verifique a chave.`);
    }

    const dados = await resposta.json();

    // Remove pessoas (media_type "person") e normaliza os campos
    estado.api = dados.results
      .filter((item) => item.media_type !== "person")
      .map(normalizarTitulo);

    estado.carregado = true;
  } catch (erro) {
    estado.erro = erro.message;
  } finally {
    estado.carregando = false;
    renderizarListagem();
  }
}

// Converte o formato da API para o formato usado na página
function normalizarTitulo(item) {
  return {
    id: `api-${item.id}`,
    titulo: item.title || item.name || "Sem título",
    tipo: item.media_type === "tv" ? "Série" : "Filme",
    genero: "",
    ano: (item.release_date || item.first_air_date || "").slice(0, 4),
    nota: item.vote_average ? item.vote_average.toFixed(1) : "—",
    sinopse: item.overview || "",
    imagem: item.poster_path ? IMAGEM_BASE + item.poster_path : "",
  };
}

function renderizarListagem() {
  const grade = document.getElementById("grade");
  const estadoEl = document.getElementById("estado-listagem");

  // Mensagens de carregamento e erro
  estadoEl.classList.toggle("erro", Boolean(estado.erro));
  estadoEl.textContent = estado.carregando
    ? "Carregando títulos..."
    : estado.erro || "";

  // Cadastrados ficam no topo da lista
  const lista = [...estado.cadastrados, ...estado.api];

  grade.replaceChildren(...lista.map(criarCard));
}

function criarCard(titulo) {
  const card = document.createElement("article");
  card.className = "card";

  if (titulo.imagem) {
    const img = document.createElement("img");
    img.src = titulo.imagem;
    img.alt = `Pôster de ${titulo.titulo}`;
    img.loading = "lazy";
    card.appendChild(img);
  } else {
    const semImagem = document.createElement("div");
    semImagem.className = "sem-imagem";
    card.appendChild(semImagem);
  }

  const corpo = document.createElement("div");
  corpo.className = "card-corpo";

  const nomeTitulo = document.createElement("h3");
  nomeTitulo.textContent = titulo.titulo;

  const meta = document.createElement("p");
  meta.className = "meta";
  const partes = [titulo.tipo, titulo.genero, titulo.ano].filter(Boolean);
  meta.textContent = partes.join(" · ");

  const nota = document.createElement("p");
  nota.className = "nota";
  nota.textContent = `Nota: ${titulo.nota}`;

  corpo.append(nomeTitulo, meta, nota);
  card.appendChild(corpo);

  return card;
}

/* ----------------------------------------------------------
   5. CADASTRO — formulário com validação
   ---------------------------------------------------------- */
const form = document.getElementById("form-cadastro");
const mensagemForm = document.getElementById("mensagem-form");
const ANO_MINIMO = 1888; // ano do primeiro filme
const ANO_MAXIMO = new Date().getFullYear() + 5;

form.addEventListener("submit", (evento) => {
  evento.preventDefault(); // impede o recarregamento da página

  const dados = {
    titulo: form.titulo.value.trim(),
    tipo: form.tipo.value,
    genero: form.genero.value.trim(),
    ano: form.ano.value.trim(),
    nota: form.nota.value.trim(),
    sinopse: form.sinopse.value.trim(),
  };

  if (!validarFormulario(dados)) {
    mostrarMensagem("Corrija os campos destacados antes de cadastrar.", "erro");
    return;
  }

  const novoTitulo = {
    id: `local-${Date.now()}`,
    titulo: dados.titulo,
    tipo: dados.tipo,
    genero: dados.genero,
    ano: dados.ano,
    nota: Number(dados.nota).toFixed(1),
    sinopse: dados.sinopse,
    imagem: "",
  };

  estado.cadastrados.unshift(novoTitulo);
  renderizarListagem();

  form.reset();
  limparErros();
  mostrarMensagem(`"${novoTitulo.titulo}" foi cadastrado e já aparece na listagem.`, "sucesso");
});

// Valida os campos e mostra o erro ao lado de cada um
function validarFormulario(dados) {
  limparErros();
  let valido = true;

  if (!dados.titulo) {
    marcarErro("titulo", "Informe o título.");
    valido = false;
  }

  if (!dados.tipo) {
    marcarErro("tipo", "Escolha filme ou série.");
    valido = false;
  }

  if (!dados.genero) {
    marcarErro("genero", "Informe o gênero.");
    valido = false;
  }

  if (dados.ano) {
    const ano = Number(dados.ano);
    if (!Number.isInteger(ano) || ano < ANO_MINIMO || ano > ANO_MAXIMO) {
      marcarErro("ano", `Use um ano entre ${ANO_MINIMO} e ${ANO_MAXIMO}.`);
      valido = false;
    }
  }

  const nota = Number(dados.nota);
  if (dados.nota === "" || Number.isNaN(nota) || nota < 0 || nota > 10) {
    marcarErro("nota", "Informe uma nota de 0 a 10.");
    valido = false;
  }

  return valido;
}

function marcarErro(campo, texto) {
  const input = form[campo];
  input.closest(".campo").classList.add("invalido");
  document.querySelector(`[data-erro="${campo}"]`).textContent = texto;
}

function limparErros() {
  document.querySelectorAll(".campo").forEach((c) => c.classList.remove("invalido"));
  document.querySelectorAll(".erro-campo").forEach((e) => (e.textContent = ""));
}

function mostrarMensagem(texto, tipo) {
  mensagemForm.textContent = texto;
  mensagemForm.className = `mensagem ${tipo}`;
}

/* ----------------------------------------------------------
   IMAGEM ILUSTRATIVA DO INÍCIO
   Se imagens/hero.jpg não existir, mostra um bloco de cor
   em vez de um ícone de imagem quebrada.
   ---------------------------------------------------------- */
const imagemHero = document.querySelector(".hero-imagem");
imagemHero.addEventListener("error", () => {
  imagemHero.classList.add("falhou");
});

/* ----------------------------------------------------------
   INICIALIZAÇÃO
   Abre a seção indicada no endereço (ex.: #listagem) ou o início.
   ---------------------------------------------------------- */
const secaoInicial = location.hash.replace("#", "");
const secoesValidas = ["inicio", "listagem", "cadastro"];
trocarSecao(secoesValidas.includes(secaoInicial) ? secaoInicial : "inicio");