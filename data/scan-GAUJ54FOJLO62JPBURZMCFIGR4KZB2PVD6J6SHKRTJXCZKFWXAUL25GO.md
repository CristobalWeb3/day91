# Day91 scan: RenderGate (payTo)

- payTo: `GAUJ54FOJLO62JPBURZMCFIGR4KZB2PVD6J6SHKRTJXCZKFWXAUL25GO` (red: stellar:testnet)
- Generado: 2026-10-12T22:44:31.743Z
- Marca de corte de la activación: **2026-10-10T20:18:37Z** (primer pago de Day91: [d8453fc3…](https://stellar.expert/explorer/testnet/tx/d8453fc3e3ecf8234606fdb06621629996b98f304fceb9dd5a9b0d9e239945da)). Fuente: `data/activation.json`.
- Cuenta creada 2026-04-13T04:11:30Z por [GAIH3U…ZNSR](https://stellar.expert/explorer/testnet/account/GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR) (friendbot (testnet)). Saldo USDC actual: 0.0830000.
- Clasificación de pagadores: **vinculado** = recibió fondos del propio payTo; **day91** = está en `data/day91-wallets.json`; **externo** = el resto.
- Todos los montos en USDC con 7 decimales.

## Línea base (antes de 2026-10-10T20:18:37Z)

| clase | pagos | pagadores | monto USDC | % de pagos |
| --- | ---: | ---: | ---: | ---: |
| vinculado | 79 | 1 | 0.0790000 | 97.5% |
| day91 | 0 | 0 | 0.0000000 | 0.0% |
| externo | 2 | 1 | 0.0020000 | 2.5% |
| **total** | 81 | 2 | 0.0810000 | 100% |

- Pagos de pagadores vinculados: **97.5%** del total.
- Primer pago: 2026-04-13T04:32:22Z · último pago: 2026-09-20T06:38:57Z · último pago externo: 2026-09-20T06:38:57Z.
- Días sin ventas externas hasta el corte: **20**.
- Últimos 90 días antes del corte: vinculado 0 pagos / 0 pagadores · day91 0 pagos / 0 pagadores · externo 2 pagos / 1 pagadores.
- Últimos 180 días antes del corte: vinculado 4 pagos / 1 pagadores · day91 0 pagos / 0 pagadores · externo 2 pagos / 1 pagadores.

### Pagos por día

| día | pagos | vinculado | day91 | externo |
| --- | ---: | ---: | ---: | ---: |
| 2026-04-13 | 79 | 79 | 0 | 0 |
| 2026-09-20 | 2 | 0 | 0 | 2 |

### Pagadores

| pagador | clase | pagos | monto USDC | primero | último |
| --- | --- | ---: | ---: | --- | --- |
| [GDMJ5B…IQR3](https://stellar.expert/explorer/testnet/account/GDMJ5B3LJJHF4TTEHIEMG5UW7XNGRZJCHEFF3YXOHR5APHVCAW5OIQR3) | vinculado | 79 | 0.0790000 | 2026-04-13T04:32:22Z | 2026-04-13T23:48:42Z |
| [GBUQ25…M3L6](https://stellar.expert/explorer/testnet/account/GBUQ25LH4BARXR4RAJZVA7QYVFTIRZD63YXYVAETETYGKMNZF5PKM3L6) | externo | 2 | 0.0020000 | 2026-09-20T00:57:47Z | 2026-09-20T06:38:57Z |

### Evidencia de vínculo

- [GDMJ5B…IQR3](https://stellar.expert/explorer/testnet/account/GDMJ5B3LJJHF4TTEHIEMG5UW7XNGRZJCHEFF3YXOHR5APHVCAW5OIQR3): 6 transferencia(s) desde el payTo · cuenta creada **5 s después del payTo** por el mismo funder ([GAIH3U…ZNSR](https://stellar.expert/explorer/testnet/account/GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR) (friendbot (testnet)))
  - 2026-04-13T12:16:40Z · 0.0010000 USDC · memo `refund:test` · [a3512b3b…](https://stellar.expert/explorer/testnet/tx/a3512b3b0719419d88bc5ff9136c57fcfbc1131ffabdf766235ed9233889b8c7)
  - 2026-04-13T12:19:30Z · 0.0010000 USDC · memo `refund:blocked_page` · [b4d45cac…](https://stellar.expert/explorer/testnet/tx/b4d45cac244bfd5c436b055323a71b2e341a7b95ea2553eaebe144c76127d446)
  - 2026-04-13T12:19:51Z · 0.0010000 USDC · memo `refund:blocked_page` · [bf68b792…](https://stellar.expert/explorer/testnet/tx/bf68b79248c9ec24ffb40cea72251b86faf065702c7038136d3309f864431831)
  - 2026-04-13T12:32:12Z · 0.0010000 USDC · memo `refund:blocked_page` · [3fea90b4…](https://stellar.expert/explorer/testnet/tx/3fea90b47a3d873a1ea4482174e7bd9fbedd4d4eead0b92ad6ac556031b52335)
  - 2026-04-13T12:32:47Z · 0.0010000 USDC · memo `refund:blocked_page` · [71541d14…](https://stellar.expert/explorer/testnet/tx/71541d14da567d02b05115f9a82a6f4bb9aca6da74d72163f6b8993dc4a60a60)
  - 2026-04-13T12:40:38Z · 0.0010000 USDC · memo `refund:blocked_page` · [2d91f45b…](https://stellar.expert/explorer/testnet/tx/2d91f45b09e684c0096bf19eb5482858e7074b3bc143768626daaeb101a94557)

> Nota: hay vínculos que vienen de devoluciones (`refund:*`). La regla también marcaría como vinculado a un comprador externo al que el servicio le devolvió un render fallido; revisar la evidencia de cada caso.

## Después del corte (desde 2026-10-10T20:18:37Z)

| clase | pagos | pagadores | monto USDC | % de pagos |
| --- | ---: | ---: | ---: | ---: |
| vinculado | 0 | 0 | 0.0000000 | 0.0% |
| day91 | 8 | 1 | 0.0080000 | 100.0% |
| externo | 0 | 0 | 0.0000000 | 0.0% |
| **total** | 8 | 1 | 0.0080000 | 100% |

| pagador | clase | pagos | monto USDC | primero | último |
| --- | --- | ---: | ---: | --- | --- |
| [GBNS6V…Q4PI](https://stellar.expert/explorer/testnet/account/GBNS6VZIEZEFIXJXIOL2PA4K3WDCF3R2O5IVHYRIJHSERZMJU764Q4PI) | day91 | 8 | 0.0080000 | 2026-10-10T20:18:37Z | 2026-10-12T17:15:27Z |

## Compradores externos

### [GBUQ25…M3L6](https://stellar.expert/explorer/testnet/account/GBUQ25LH4BARXR4RAJZVA7QYVFTIRZD63YXYVAETETYGKMNZF5PKM3L6)

- Alta: 2026-09-20T00:19:57Z por [GBICCL…JU6V](https://stellar.expert/explorer/testnet/account/GBICCLC22HBCJTUBWHVDZ4KMXT4HJQZRQHFJPO7KW27PCOW4JEAFJU6V); reservas patrocinadas por [GBICCL…JU6V](https://stellar.expert/explorer/testnet/account/GBICCLC22HBCJTUBWHVDZ4KMXT4HJQZRQHFJPO7KW27PCOW4JEAFJU6V).
- Actividad: 2026-09-20T00:19:57Z → 2026-09-20T07:44:07Z.
- Fondeo: 2.0000000 USDC desde [CCAML6…VSGI](https://stellar.expert/explorer/testnet/contract/CCAML62QF5D6ZV2CNIFBSKJK7HMTX4K473P7NGNNRAWVVLRNTOCFVSGI) (2026-09-20T00:22:47Z, [73ff4150…](https://stellar.expert/explorer/testnet/tx/73ff4150c80dbe59bf008031db6597c2d09eb01e7f5fff6fcf9092dc48bfa58c)).
- Gasto en servicios: 0.1020000 USDC; en este payTo: 0.0020000 USDC (2.0%).

Servicios x402 (pagos enviados por un facilitator):

| servicio (payTo) | pagos | monto USDC | precio unitario | facilitator(s) | primero | último |
| --- | ---: | ---: | --- | --- | --- | --- |
| [GDXKBO…GWQU](https://stellar.expert/explorer/testnet/account/GDXKBOCCIUWIJ4O355O3YUSB46G5TGCOJ2LSADU7KB67EBT23KMAGWQU) | 8 | 0.0800000 | 0.0100000 | [GC6CSX…YN3K](https://stellar.expert/explorer/testnet/account/GC6CSXBV4C6RL3HEDTW57KXYXSSXKAWKGYDEOSATXM3XNKXSR2VRYN3K) (facilitator x402 (x402.org)) | 2026-09-20T00:29:02Z | 2026-09-20T07:44:07Z |
| [GAUJ54…25GO](https://stellar.expert/explorer/testnet/account/GAUJ54FOJLO62JPBURZMCFIGR4KZB2PVD6J6SHKRTJXCZKFWXAUL25GO) (RenderGate (payTo)) | 2 | 0.0020000 | 0.0010000 | [GC6CSX…YN3K](https://stellar.expert/explorer/testnet/account/GC6CSXBV4C6RL3HEDTW57KXYXSSXKAWKGYDEOSATXM3XNKXSR2VRYN3K) (facilitator x402 (x402.org)) | 2026-09-20T00:57:47Z | 2026-09-20T06:38:57Z |
| [GCHEI4…OR2W](https://stellar.expert/explorer/testnet/account/GCHEI4PQEFJOA27MNZRPQNLGURS6KASW76X5UZCUZIXCOJLKXYCXOR2W) (payTo de ejemplo de los tests oficiales x402/Stellar) | 2 | 0.0200000 | 0.0100000 | [GCGKCI…NDYL](https://stellar.expert/explorer/testnet/account/GCGKCIJE7S22OLQUWURUIL7OFMTVJY77RDZIO6ZJADVFLRUMRW6MNDYL), [GA6QLQ…O67I](https://stellar.expert/explorer/testnet/account/GA6QLQOQFN36EV6NRIZAGMNA42MFG2XGCX23KYF6VE5DTBXPPS5RO67I) | 2026-09-20T00:58:27Z | 2026-09-20T06:38:42Z |

- Bridge CCTP: 1.0000000 USDC → Base (dominio 6), destinatario 0xc97c1ca97df407f7ca9039c5d392e8868f234b4f · 2026-09-20T06:42:37Z · [f37b4310…](https://stellar.expert/explorer/testnet/tx/f37b4310bd74fd9ee39ccda806ce982919020c55100bd76b80050dfbd1289df0)

## Cohortes por operador

### Operador [GBICCL…JU6V](https://stellar.expert/explorer/testnet/account/GBICCLC22HBCJTUBWHVDZ4KMXT4HJQZRQHFJPO7KW27PCOW4JEAFJU6V)

- Llegamos aquí por: [GBUQ25…M3L6](https://stellar.expert/explorer/testnet/account/GBUQ25LH4BARXR4RAJZVA7QYVFTIRZD63YXYVAETETYGKMNZF5PKM3L6).
- **40 `create_account`** entre 2026-09-19T20:20:12Z y 2026-09-24T16:08:57Z (40 con reservas patrocinadas).
- Wallets fondeadas con USDC: 13 · pagaron algún servicio x402: 5 · pagaron este payTo: **1** · hicieron bridge: 3.

Servicios x402 que paga la cohorte:

| servicio (payTo) | wallets | pagos | monto USDC |
| --- | ---: | ---: | ---: |
| [GAU2ME…BTVU](https://stellar.expert/explorer/testnet/account/GAU2MEYD2CWV46OM7W3H7I7BMN34WEXN54EBJ3VNZLE6XJ2EY3GIBTVU) | 3 | 14 | 0.1400000 |
| [GDXKBO…GWQU](https://stellar.expert/explorer/testnet/account/GDXKBOCCIUWIJ4O355O3YUSB46G5TGCOJ2LSADU7KB67EBT23KMAGWQU) | 2 | 9 | 0.0900000 |
| [GAUJ54…25GO](https://stellar.expert/explorer/testnet/account/GAUJ54FOJLO62JPBURZMCFIGR4KZB2PVD6J6SHKRTJXCZKFWXAUL25GO) (RenderGate (payTo)) | 1 | 2 | 0.0020000 |
| [GCHEI4…OR2W](https://stellar.expert/explorer/testnet/account/GCHEI4PQEFJOA27MNZRPQNLGURS6KASW76X5UZCUZIXCOJLKXYCXOR2W) (payTo de ejemplo de los tests oficiales x402/Stellar) | 1 | 2 | 0.0200000 |

Otras salidas USDC de la cohorte (no x402):

- [CDGUGN…E6XV](https://stellar.expert/explorer/testnet/contract/CDGUGNN7HMTLOLCANFSECMSBN5MCIEMDRPZU4RXF6BDO5LRTSYW2E6XV): 3 wallet(s), 8 transferencia(s), 491.5810465 USDC
- [CDQ4AK…2SKF](https://stellar.expert/explorer/testnet/contract/CDQ4AKWX7D7C7GFEGWQUCALUUUYFOJFY56HRST36M2NE5XB2GPWV2SKF): 1 wallet(s), 13 transferencia(s), 13.0900000 USDC
- [CBTDTU…4UJ2](https://stellar.expert/explorer/testnet/contract/CBTDTUQ4I5C5VHUGQW3YLZWLGJCUSTOSO4433KLEUIWPACYJDYG44UJ2): 1 wallet(s), 2 transferencia(s), 2.0400000 USDC
- [CB6JVJ…35ZH](https://stellar.expert/explorer/testnet/contract/CB6JVJPBFHZFN6JLDJFR62U2OBTK66RK3YV3KVWIJTBAL23W636535ZH): 1 wallet(s), 1 transferencia(s), 16.0000000 USDC
- [CDC4KP…TONO](https://stellar.expert/explorer/testnet/contract/CDC4KP6R2IUU2O7GGDGR3525YFZT74VOLSBVVHBWFP6KGATQKQVGTONO): 1 wallet(s), 1 transferencia(s), 1.0100000 USDC
- [CCAML6…VSGI](https://stellar.expert/explorer/testnet/contract/CCAML62QF5D6ZV2CNIFBSKJK7HMTX4K473P7NGNNRAWVVLRNTOCFVSGI): 1 wallet(s), 1 transferencia(s), 4.5000000 USDC

## Sondeo del servicio

- Ficha `GET https://tantk-rendergate.hf.space/` → 200 en 819 ms: `{"service":"RenderGate","description":"Pay-per-render headless browser API on Stellar x402","price":"$0.001","network":"stellar:testnet","usage":"GET /render?url=<encoded_url>"}`
- 402 `GET https://tantk-rendergate.hf.space/render?url=https%3A%2F%2Fexample.com` → 402 en 522 ms (x402 v2).

| scheme | red | asset | payTo | amount (raw) | amount USDC | maxTimeoutSeconds | extra |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| exact | stellar:testnet | CBIELT…DAMA | GAUJ54…25GO | 10000 | 0.0010000 | 60 | `{"areFeesSponsored":true}` |

Chequeo de consistencia (ficha vs 402):

- ✅ precio ficha = precio 402: ficha $0.001 · 402 0.0010000 USDC (raw 10000, 7 decimales)
- ✅ red ficha = red 402: stellar:testnet · stellar:testnet
- ✅ payTo 402 = payTo analizado: GAUJ54FOJLO62JPBURZMCFIGR4KZB2PVD6J6SHKRTJXCZKFWXAUL25GO
- ✅ asset 402 = USDC SAC testnet: CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
