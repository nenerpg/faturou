const supabase = require('./supabase');

const PACOTES_PADRAO = [
  { id: 'cobre', nome: 'Cobre', numeros: 5, valor: 7.9, valorAnchor: 30, tag: 'Cobre', checkoutUrl: 'https://go.animuspay.com.br/pmifycsf6w' },
  { id: 'bronze', nome: 'Bronze', numeros: 12, valor: 14.9, valorAnchor: 60, tag: 'Bronze', checkoutUrl: 'https://go.animuspay.com.br/mtpkc' },
  { id: 'prata', nome: 'Prata', numeros: 25, valor: 27.9, valorAnchor: 120, tag: 'Prata', checkoutUrl: 'https://go.animuspay.com.br/ao7us' },
  { id: 'ouro', nome: 'Ouro', numeros: 45, valor: 44.9, valorAnchor: 200, tag: 'Ouro', destaque: true, checkoutUrl: 'https://go.animuspay.com.br/iodnw' },
  { id: 'rubi', nome: 'Rubi', numeros: 80, valor: 69.9, valorAnchor: 320, tag: 'Rubi', checkoutUrl: 'https://go.animuspay.com.br/mypye' },
  { id: 'esmeralda', nome: 'Esmeralda', numeros: 150, valor: 114.9, valorAnchor: 500, tag: 'Esmeralda', checkoutUrl: 'https://go.animuspay.com.br/ernzk' },
  { id: 'diamante', nome: 'Diamante', numeros: 300, valor: 199.9, valorAnchor: 900, tag: 'Diamante', checkoutUrl: 'https://go.animuspay.com.br/9lwtb' },
];

const CAMPANHAS = [
  {
    slug: 'iphone-17-pro',
    titulo: 'iPhone 17 Pro 256GB',
    subtitulo: 'Cosmic Orange · Nota fiscal e frete inclusos',
    descricao:
      'Compre nosso ebook e receba números da sorte. Sorteio com base na Loteria Federal da Caixa.',
    premio_nome: 'iPhone 17 Pro',
    premio_imagem:
      'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/iphone-compare-iphone-17-pro-202509?wid=400&hei=512&fmt=png-alpha',
    hero_desktop: 'hero-desktop-new.png',
    hero_mobile: 'hero-nova-mobile.png',
    status: 'ativa',
    destaque: true,
    ordem: 1,
    valor_premio_estimado: 8999,
    data_inicio: '2026-05-25',
    data_fim: '2026-08-01',
    data_extracao: '2026-08-01',
    numeros_vendidos: 347,
    total_numeros_display: 1000,
    pacotes: PACOTES_PADRAO,
    chave_pix: '11999999999',
    whatsapp: '5511999999999',
  },
  {
    slug: 'playstation-5',
    titulo: 'PlayStation 5 + 2 jogos',
    subtitulo: 'Edição digital · Entrega em todo o Brasil',
    descricao: 'Promoção comercial com ebook digital. Números da sorte via Loteria Federal.',
    premio_nome: 'PlayStation 5',
    premio_imagem:
      'https://gmedia.playstation.com/is/image/SIEPDC/ps5-product-thumbnail-01-en-14sep21?$facebook$',
    hero_desktop: 'hero-desktop-new.png',
    hero_mobile: 'hero-nova-mobile.png',
    status: 'rascunho',
    destaque: false,
    ordem: 2,
    valor_premio_estimado: 4299,
    data_inicio: '2026-06-01',
    data_fim: '2026-09-15',
    data_extracao: '2026-09-15',
    numeros_vendidos: 128,
    total_numeros_display: 800,
    pacotes: PACOTES_PADRAO,
    chave_pix: '11999999999',
    whatsapp: '5511999999999',
  },
  {
    slug: 'smart-tv-65',
    titulo: 'Smart TV 65" 4K',
    subtitulo: 'Samsung Crystal UHD · Garantia oficial',
    descricao: 'Participe comprando o ebook. Apuração transparente pela Loteria Federal.',
    premio_nome: 'Smart TV 65"',
    premio_imagem:
      'https://images.samsung.com/is/image/samsung/p6pim/br/ua65du7700gxzd/gallery/br-crystal-uhd-uhd-4k-smart-tv-ua65du7700g-530864985',
    hero_desktop: 'hero-desktop.png',
    hero_mobile: 'hero-mobile.png',
    status: 'rascunho',
    destaque: false,
    ordem: 3,
    valor_premio_estimado: 3499,
    data_inicio: '2026-06-01',
    data_fim: '2026-10-01',
    data_extracao: '2026-10-01',
    numeros_vendidos: 89,
    total_numeros_display: 600,
    pacotes: PACOTES_PADRAO,
    chave_pix: '11999999999',
    whatsapp: '5511999999999',
  },
];

async function seedCampanhas() {
  const { count } = await supabase
    .from('campanhas')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) return;

  const { error } = await supabase.from('campanhas').upsert(CAMPANHAS, { onConflict: 'slug' });
  if (error) {
    console.error('Seed erro:', error.message);
  } else {
    console.log(`Seed: ${CAMPANHAS.length} campanhas criadas.`);
  }
}

module.exports = { seedCampanhas, CAMPANHAS };
