-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "nomeRecebedor" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "dataEntrega" TIMESTAMP(3) NOT NULL,
    "horaEntrega" TEXT NOT NULL,
    "tempoEstimadoProducao" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "altura" DOUBLE PRECISION NOT NULL,
    "largura" DOUBLE PRECISION NOT NULL,
    "profundidade" DOUBLE PRECISION NOT NULL,
    "statusProducao" TEXT NOT NULL DEFAULT 'Aguardando Produção',
    "inicioProducao" TIMESTAMP(3),
    "fimProducao" TIMESTAMP(3),
    "tempoPausado" INTEGER NOT NULL DEFAULT 0,
    "rotaId" TEXT,
    "valorTotalCompra" DOUBLE PRECISION,
    "valorFretePago" DOUBLE PRECISION,
    "valorFreteReal" DOUBLE PRECISION,
    "origemPedido" TEXT,
    "formaPagamento" TEXT,
    "pedidoAnonimo" BOOLEAN NOT NULL DEFAULT false,
    "mensagemAnonima" TEXT,
    "nomeComprador" TEXT,
    "telefoneComprador" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rota" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipoVeiculo" TEXT NOT NULL,
    "pesoTotal" DOUBLE PRECISION NOT NULL,
    "distanciaTotal" DOUBLE PRECISION,
    "tempoEstimadoTotal" INTEGER,
    "ordem" JSONB NOT NULL,
    "geometria" JSONB,
    "status" TEXT NOT NULL DEFAULT 'Planejada',
    "lalamoveOrderId" TEXT,
    "lalamoveStatus" TEXT,
    "lalamoveShareLink" TEXT,
    "lalamoveQuotationId" TEXT,
    "lalamoveServiceType" TEXT,
    "lalamovePrice" DOUBLE PRECISION,
    "lalamoveDriverName" TEXT,
    "lalamoveDriverPhone" TEXT,
    "lalamovePlateNumber" TEXT,
    "lalamoveChamadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoStatus" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "statusAnterior" TEXT,
    "statusNovo" TEXT NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "id" TEXT NOT NULL DEFAULT 'config_principal',
    "nomeEmpresa" TEXT NOT NULL DEFAULT 'Mirella Doces',
    "cep" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "telefone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "altura" DOUBLE PRECISION NOT NULL DEFAULT 37,
    "largura" DOUBLE PRECISION NOT NULL DEFAULT 27,
    "comprimento" DOUBLE PRECISION NOT NULL DEFAULT 27,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pedido_statusProducao_idx" ON "Pedido"("statusProducao");

-- CreateIndex
CREATE INDEX "Pedido_dataEntrega_idx" ON "Pedido"("dataEntrega");

-- CreateIndex
CREATE INDEX "Pedido_rotaId_idx" ON "Pedido"("rotaId");

-- CreateIndex
CREATE INDEX "Pedido_origemPedido_idx" ON "Pedido"("origemPedido");

-- CreateIndex
CREATE INDEX "Rota_data_idx" ON "Rota"("data");

-- CreateIndex
CREATE INDEX "Rota_status_idx" ON "Rota"("status");

-- CreateIndex
CREATE INDEX "Rota_lalamoveOrderId_idx" ON "Rota"("lalamoveOrderId");

-- CreateIndex
CREATE INDEX "HistoricoStatus_pedidoId_idx" ON "HistoricoStatus"("pedidoId");

-- CreateIndex
CREATE INDEX "Item_nome_idx" ON "Item"("nome");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_rotaId_fkey" FOREIGN KEY ("rotaId") REFERENCES "Rota"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoStatus" ADD CONSTRAINT "HistoricoStatus_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
