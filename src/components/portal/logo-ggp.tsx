import Image from "next/image";

/**
 * Logotipo GGP. Os PNGs oficiais (4800×4800) têm margens transparentes; a
 * área visível de cada versão foi medida no arquivo e o recorte é calculado
 * aqui, sem alterar a arte. A versão clara aparece no tema claro e a branca no
 * escuro (classes em globals.css).
 */
const ARQUIVO = 4800;
const VISIVEL = { largura: 3952, altura: 1952 };
const VARIANTES = [
  { src: "/brand/ggp-logo-gray-blue.png", classe: "logo-ggp--claro", x: 424, y: 1424 },
  { src: "/brand/ggp-logo-white-blue.png", classe: "logo-ggp--escuro", x: 496, y: 1580 },
] as const;

export function LogoGgp({
  largura,
  prioridade = false,
  rotulo,
}: Readonly<{ largura: number; prioridade?: boolean; rotulo?: string }>) {
  const escala = largura / VISIVEL.largura;
  const altura = Math.round(VISIVEL.altura * escala * 100) / 100;
  const lado = ARQUIVO * escala;

  return (
    <span
      className="logo-ggp"
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
      style={{ position: "relative", display: "inline-block", width: largura, height: altura, overflow: "hidden", flex: "none" }}
    >
      {VARIANTES.map((variante) => (
        <span
          key={variante.src}
          className={variante.classe}
          style={{
            position: "absolute",
            left: -variante.x * escala,
            top: -variante.y * escala,
            width: lado,
            height: lado,
          }}
        >
          <Image src={variante.src} alt="" fill sizes={`${Math.ceil(lado)}px`} priority={prioridade} style={{ objectFit: "contain" }} />
        </span>
      ))}
    </span>
  );
}
