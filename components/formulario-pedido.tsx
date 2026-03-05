'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { validarCPF, formatarCPF, validarTelefone, formatarTelefone, validarCEP, formatarCEP, buscarEnderecoPorCEP } from '@/lib/validations';
import { Package, MapPin, Calendar, FileText, CheckCircle, PlusCircle, Monitor, DollarSign, Truck, ShoppingCart, CreditCard, User, EyeOff, MessageSquare, Calculator, Loader2, Bike, Car, Save, BoxIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface CotacaoFrete {
  tipo: string;
  nome: string;
  valor: number;
  fonte: string;
}

interface ItemBase {
  id: string;
  nome: string;
  descricao?: string;
  altura: number;
  largura: number;
  comprimento: number;
  peso: number;
}

export function FormularioPedido({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [calculandoFrete, setCalculandoFrete] = useState(false);
  const [cotacoesModal, setCotacoesModal] = useState(false);
  const [cotacoes, setCotacoes] = useState<CotacaoFrete[]>([]);
  const [distanciaFrete, setDistanciaFrete] = useState<number | null>(null);
  const [fonteFrete, setFonteFrete] = useState<string>('');
  // Estados para itens base
  const [itens, setItens] = useState<ItemBase[]>([]);
  const [itemSelecionado, setItemSelecionado] = useState<string>('');
  const [salvandoItem, setSalvandoItem] = useState(false);
  const [formData, setFormData] = useState({
    nomeRecebedor: '',
    telefone: '',
    cpf: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    dataEntrega: '',
    horaEntrega: '',
    tempoEstimadoProducao: '',
    status: '',
    descricao: '',
    // Valores padrão para dimensões
    peso: '1',
    altura: '37',
    largura: '27',
    profundidade: '27',
    // Novos campos
    valorTotalCompra: '',
    valorFretePago: '',
    valorFreteReal: '',
    origemPedido: '',
    formaPagamento: '',
    pedidoAnonimo: false,
    mensagemAnonima: '',
    nomeComprador: '',
    telefoneComprador: '',
  });

  // Carregar itens base ao montar
  useEffect(() => {
    carregarItens();
  }, []);

  const carregarItens = async () => {
    try {
      const response = await fetch('/api/itens');
      if (response.ok) {
        const data = await response.json();
        setItens(data);
      }
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    }
  };

  // Selecionar item e preencher dimensões
  const selecionarItem = (itemId: string) => {
    setItemSelecionado(itemId);
    if (itemId) {
      const item = itens.find(i => i.id === itemId);
      if (item) {
        setFormData({
          ...formData,
          descricao: item.descricao || formData.descricao,
          peso: item.peso.toString(),
          altura: item.altura.toString(),
          largura: item.largura.toString(),
          profundidade: item.comprimento.toString(),
        });
        toast.success(`Dimensões de "${item.nome}" aplicadas`);
      }
    }
  };

  // Salvar item atual como item base
  const salvarComoItem = async () => {
    if (!formData.descricao?.trim()) {
      toast.error('Digite uma descrição para salvar como item');
      return;
    }
    setSalvandoItem(true);
    try {
      const response = await fetch('/api/itens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.descricao.trim(),
          descricao: formData.descricao.trim(),
          altura: parseFloat(formData.altura) || 37,
          largura: parseFloat(formData.largura) || 27,
          comprimento: parseFloat(formData.profundidade) || 27,
          peso: parseFloat(formData.peso) || 1,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Item salvo com sucesso!');
        carregarItens();
      } else {
        toast.error(data?.error || 'Erro ao salvar item');
      }
    } catch {
      toast.error('Erro ao salvar item');
    } finally {
      setSalvandoItem(false);
    }
  };

  const handleCEPChange = async (cep: string) => {
    const cepFormatado = formatarCEP(cep);
    setFormData({ ...formData, cep: cepFormatado });

    if (validarCEP(cep)) {
      const endereco = await buscarEnderecoPorCEP(cep);
      if (endereco) {
        setFormData({
          ...formData,
          cep: cepFormatado,
          endereco: endereco?.logradouro ?? '',
          bairro: endereco?.bairro ?? '',
          cidade: endereco?.cidade ?? '',
          estado: endereco?.estado ?? '',
        });
        toast.success('Endereço encontrado!');
      } else {
        toast.error('CEP não encontrado');
      }
    }
  };

  // Calcular frete rápido - abre modal com cotações Lalamove
  const calcularFreteRapido = async () => {
    // Validar se tem endereço suficiente
    if (!formData.cidade && !validarCEP(formData?.cep ?? '')) {
      toast.error('Preencha o endereço de entrega primeiro');
      return;
    }
    setCalculandoFrete(true);
    try {
      const response = await fetch('/api/frete/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cep: formData.cep,
          endereco: formData.endereco,
          bairro: formData.bairro,
          cidade: formData.cidade,
          estado: formData.estado,
        }),
      });
      const data = await response.json();
      if (data?.cotacoes && data.cotacoes.length > 0) {
        setCotacoes(data.cotacoes);
        setDistanciaFrete(data.distancia || null);
        setFonteFrete(data.fonte || '');
        setCotacoesModal(true);
      } else {
        toast.error(data?.error ?? 'Não foi possível calcular o frete');
      }
    } catch {
      toast.error('Erro ao calcular frete. Digite manualmente.');
    } finally {
      setCalculandoFrete(false);
    }
  };

  // Selecionar cotação de frete
  const selecionarCotacao = (cotacao: CotacaoFrete) => {
    setFormData({ ...formData, valorFreteReal: cotacao.valor.toString() });
    setCotacoesModal(false);
    toast.success(`Frete ${cotacao.nome} selecionado: R$ ${cotacao.valor.toFixed(2)}`);
  };

  // Ícone do veículo
  const getVeiculoIcon = (tipo: string) => {
    switch (tipo) {
      case 'LALAGO': return <Bike className="w-5 h-5" />;
      case 'CAR': return <Car className="w-5 h-5" />;
      case 'VAN': return <Truck className="w-5 h-5" />;
      default: return <Truck className="w-5 h-5" />;
    }
  };

  // Calcular diferença de frete
  const diferencaFrete = () => {
    const pago = parseFloat(formData.valorFretePago) || 0;
    const real = parseFloat(formData.valorFreteReal) || 0;
    return pago - real;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();
    setLoading(true);

    try {
      // Validações - CPF é opcional, mas se preenchido deve ser válido
      if (formData?.cpf?.trim() && !validarCPF(formData.cpf)) {
        toast.error('CPF inválido');
        setLoading(false);
        return;
      }

      if (formData?.telefone?.trim() && !validarTelefone(formData.telefone)) {
        toast.error('Telefone inválido');
        setLoading(false);
        return;
      }

      if (!validarCEP(formData?.cep ?? '')) {
        toast.error('CEP inválido');
        setLoading(false);
        return;
      }

      // Enviar pedido - API faz geocodificação automática
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response?.ok) {
        toast.success('Pedido cadastrado com sucesso!');
        setFormData({
          nomeRecebedor: '',
          telefone: '',
          cpf: '',
          cep: '',
          endereco: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: '',
          dataEntrega: '',
          horaEntrega: '',
          tempoEstimadoProducao: '',
          status: '',
          descricao: '',
          // Manter valores padrão das dimensões
          peso: '1',
          altura: '37',
          largura: '27',
          profundidade: '27',
          valorTotalCompra: '',
          valorFretePago: '',
          valorFreteReal: '',
          origemPedido: '',
          formaPagamento: '',
          pedidoAnonimo: false,
          mensagemAnonima: '',
          nomeComprador: '',
          telefoneComprador: '',
        });
        setItemSelecionado('');
        setShowSuccessDialog(true);
      } else {
        const error = await response?.json?.();
        toast.error(error?.error ?? 'Erro ao cadastrar pedido');
      }
    } catch (error) {
      console.error('Erro ao cadastrar pedido:', error);
      toast.error('Erro ao cadastrar pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Origem e Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-red-500" />
            Origem e Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="origemPedido">Origem do Pedido *</Label>
              <Select
                id="origemPedido"
                value={formData?.origemPedido ?? ''}
                onChange={(e) => setFormData({ ...formData, origemPedido: e?.target?.value ?? '' })}
                required
              >
                <option value="">Selecione...</option>
                <option value="Site">Site</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Retirada">Retirada na Loja</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="formaPagamento">Forma de Pagamento *</Label>
              <Select
                id="formaPagamento"
                value={formData?.formaPagamento ?? ''}
                onChange={(e) => setFormData({ ...formData, formaPagamento: e?.target?.value ?? '' })}
                required
              >
                <option value="">Selecione...</option>
                <option value="Pix">Pix</option>
                <option value="Link">Link de Pagamento</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartao">Cartão</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Comprador */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-6 h-6 text-red-500" />
            Dados do Comprador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nomeComprador">Nome do Comprador</Label>
              <Input
                id="nomeComprador"
                value={formData?.nomeComprador ?? ''}
                onChange={(e) => setFormData({ ...formData, nomeComprador: e?.target?.value ?? '' })}
                placeholder="Quem está comprando"
              />
            </div>
            <div>
              <Label htmlFor="telefoneComprador">Telefone do Comprador</Label>
              <Input
                id="telefoneComprador"
                value={formData?.telefoneComprador ?? ''}
                onChange={(e) => setFormData({ ...formData, telefoneComprador: formatarTelefone(e?.target?.value ?? '') })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {/* Pedido Anônimo e Mensagem */}
          <div className="border-t pt-4 mt-4 space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="pedidoAnonimo"
                checked={formData?.pedidoAnonimo ?? false}
                onCheckedChange={(checked) => setFormData({ ...formData, pedidoAnonimo: checked as boolean })}
              />
              <Label htmlFor="pedidoAnonimo" className="flex items-center gap-2 cursor-pointer">
                <EyeOff className="w-4 h-4 text-gray-500" />
                Pedido Anônimo (ocultar dados do comprador na entrega)
              </Label>
            </div>

            <div>
              <Label htmlFor="mensagemAnonima" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                Mensagem do Presente / Observação (opcional)
              </Label>
              <Textarea
                id="mensagemAnonima"
                value={formData?.mensagemAnonima ?? ''}
                onChange={(e) => setFormData({ ...formData, mensagemAnonima: e?.target?.value ?? '' })}
                placeholder={formData?.pedidoAnonimo ? "Deixe uma mensagem especial... (Se vazio, usará: \"Este presente foi enviado anonimamente.\")" : "Deixe uma mensagem para o recebedor ou observação do pedido..."}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Recebedor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-6 h-6 text-red-500" />
            Dados do Recebedor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nomeRecebedor">Nome de quem vai receber *</Label>
            <Input
              id="nomeRecebedor"
              value={formData?.nomeRecebedor ?? ''}
              onChange={(e) => setFormData({ ...formData, nomeRecebedor: e?.target?.value ?? '' })}
              required
              placeholder="Digite o nome completo"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="telefone">Telefone do Recebedor</Label>
              <Input
                id="telefone"
                value={formData?.telefone ?? ''}
                onChange={(e) => setFormData({ ...formData, telefone: formatarTelefone(e?.target?.value ?? '') })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF (opcional)</Label>
              <Input
                id="cpf"
                value={formData?.cpf ?? ''}
                onChange={(e) => setFormData({ ...formData, cpf: formatarCPF(e?.target?.value ?? '') })}
                placeholder="000.000.000-00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-red-500" />
            Endereço de Entrega
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cep">CEP *</Label>
            <Input
              id="cep"
              value={formData?.cep ?? ''}
              onChange={(e) => handleCEPChange(e?.target?.value ?? '')}
              required
              placeholder="00000-000"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="endereco">Endereço *</Label>
              <Input
                id="endereco"
                value={formData?.endereco ?? ''}
                onChange={(e) => setFormData({ ...formData, endereco: e?.target?.value ?? '' })}
                required
                placeholder="Rua, Avenida..."
              />
            </div>

            <div>
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={formData?.numero ?? ''}
                onChange={(e) => setFormData({ ...formData, numero: e?.target?.value ?? '' })}
                placeholder="123"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="complemento">Complemento</Label>
            <Input
              id="complemento"
              value={formData?.complemento ?? ''}
              onChange={(e) => setFormData({ ...formData, complemento: e?.target?.value ?? '' })}
              placeholder="Apto, Bloco..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="bairro">Bairro *</Label>
              <Input
                id="bairro"
                value={formData?.bairro ?? ''}
                onChange={(e) => setFormData({ ...formData, bairro: e?.target?.value ?? '' })}
                required
              />
            </div>

            <div>
              <Label htmlFor="cidade">Cidade *</Label>
              <Input
                id="cidade"
                value={formData?.cidade ?? ''}
                onChange={(e) => setFormData({ ...formData, cidade: e?.target?.value ?? '' })}
                required
              />
            </div>

            <div>
              <Label htmlFor="estado">Estado *</Label>
              <Input
                id="estado"
                value={formData?.estado ?? ''}
                onChange={(e) => setFormData({ ...formData, estado: e?.target?.value ?? '' })}
                required
                maxLength={2}
                placeholder="SP"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-red-500" />
            Informações de Entrega
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dataEntrega">Data da Entrega *</Label>
              <Input
                id="dataEntrega"
                type="date"
                value={formData?.dataEntrega ?? ''}
                onChange={(e) => setFormData({ ...formData, dataEntrega: e?.target?.value ?? '' })}
                required
              />
            </div>

            <div>
              <Label htmlFor="horaEntrega">Hora da Entrega *</Label>
              <Input
                id="horaEntrega"
                type="time"
                value={formData?.horaEntrega ?? ''}
                onChange={(e) => setFormData({ ...formData, horaEntrega: e?.target?.value ?? '' })}
                required
              />
            </div>

            <div>
              <Label htmlFor="tempoEstimadoProducao">Tempo de Produção (min) *</Label>
              <Input
                id="tempoEstimadoProducao"
                type="number"
                value={formData?.tempoEstimadoProducao ?? ''}
                onChange={(e) => setFormData({ ...formData, tempoEstimadoProducao: e?.target?.value ?? '' })}
                required
                min="1"
                placeholder="60"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status do Pedido *</Label>
            <Select
              id="status"
              value={formData?.status ?? ''}
              onChange={(e) => setFormData({ ...formData, status: e?.target?.value ?? '' })}
              required
            >
              <option value="">Selecione...</option>
              <option value="Urgente">Urgente</option>
              <option value="Normal">Normal</option>
              <option value="Presente">Presente</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Valores e Frete */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-red-500" />
            Valores e Frete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="valorTotalCompra">Valor Total da Compra (R$)</Label>
            <Input
              id="valorTotalCompra"
              type="number"
              step="0.01"
              value={formData?.valorTotalCompra ?? ''}
              onChange={(e) => setFormData({ ...formData, valorTotalCompra: e?.target?.value ?? '' })}
              placeholder="150.00"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valorFretePago">Frete Cobrado do Cliente (R$)</Label>
              <Input
                id="valorFretePago"
                type="number"
                step="0.01"
                value={formData?.valorFretePago ?? ''}
                onChange={(e) => setFormData({ ...formData, valorFretePago: e?.target?.value ?? '' })}
                placeholder="15.00"
              />
            </div>
            <div>
              <Label htmlFor="valorFreteReal" className="flex items-center gap-2">
                Custo Real do Frete (R$)
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={calcularFreteRapido}
                  disabled={calculandoFrete}
                  className="h-6 px-2 text-xs"
                >
                  {calculandoFrete ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Calculator className="w-3 h-3 mr-1" />
                      Calcular
                    </>
                  )}
                </Button>
              </Label>
              <Input
                id="valorFreteReal"
                type="number"
                step="0.01"
                value={formData?.valorFreteReal ?? ''}
                onChange={(e) => setFormData({ ...formData, valorFreteReal: e?.target?.value ?? '' })}
                placeholder="12.00"
              />
            </div>
          </div>

          {/* Indicador de Lucro/Prejuízo */}
          {(formData.valorFretePago && formData.valorFreteReal) && (
            <div className={`p-3 rounded-lg border ${diferencaFrete() >= 0 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
              <p className="text-sm font-medium flex items-center gap-2">
                <Truck className="w-4 h-4" />
                {diferencaFrete() >= 0 ? (
                  <span className="text-green-700 dark:text-green-400">
                    Lucro no frete: R$ {diferencaFrete().toFixed(2)}
                  </span>
                ) : (
                  <span className="text-red-700 dark:text-red-400">
                    Prejuízo no frete: R$ {Math.abs(diferencaFrete()).toFixed(2)}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                (Informação interna - não visível ao cliente)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-red-500" />
            Descrição e Dimensões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de Item Base */}
          <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
            <div className="flex items-center gap-2 mb-2">
              <BoxIcon className="w-4 h-4 text-red-500" />
              <Label className="text-sm font-medium">Carregar Item Salvo</Label>
            </div>
            <div className="flex gap-2">
              <select
                value={itemSelecionado}
                onChange={(e) => selecionarItem(e.target.value)}
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Selecione um item salvo...</option>
                {itens.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} ({item.altura}x{item.largura}x{item.comprimento}cm, {item.peso}kg)
                  </option>
                ))}
              </select>
            </div>
            {itens.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Nenhum item salvo ainda. Salve um item abaixo para reutilizar.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="descricao">Descrição do Pedido *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={salvarComoItem}
                disabled={salvandoItem || !formData.descricao?.trim()}
                className="h-7 text-xs gap-1"
              >
                {salvandoItem ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Salvar Item
              </Button>
            </div>
            <Textarea
              id="descricao"
              value={formData?.descricao ?? ''}
              onChange={(e) => setFormData({ ...formData, descricao: e?.target?.value ?? '' })}
              required
              placeholder="Descreva os itens do pedido..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use "Salvar Item" para guardar este item e suas dimensões para uso futuro.
            </p>
          </div>

          <div>
            <Label htmlFor="peso">Peso (kg) *</Label>
            <Input
              id="peso"
              type="number"
              step="0.1"
              value={formData?.peso ?? ''}
              onChange={(e) => setFormData({ ...formData, peso: e?.target?.value ?? '' })}
              required
              min="0.1"
              placeholder="1"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="altura">Altura (cm) *</Label>
              <Input
                id="altura"
                type="number"
                step="0.1"
                value={formData?.altura ?? ''}
                onChange={(e) => setFormData({ ...formData, altura: e?.target?.value ?? '' })}
                required
                min="0.1"
                placeholder="37"
              />
            </div>

            <div>
              <Label htmlFor="largura">Largura (cm) *</Label>
              <Input
                id="largura"
                type="number"
                step="0.1"
                value={formData?.largura ?? ''}
                onChange={(e) => setFormData({ ...formData, largura: e?.target?.value ?? '' })}
                required
                min="0.1"
                placeholder="27"
              />
            </div>

            <div>
              <Label htmlFor="profundidade">Profundidade (cm) *</Label>
              <Input
                id="profundidade"
                type="number"
                step="0.1"
                value={formData?.profundidade ?? ''}
                onChange={(e) => setFormData({ ...formData, profundidade: e?.target?.value ?? '' })}
                required
                min="0.1"
                placeholder="27"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? 'Cadastrando...' : 'Cadastrar Pedido'}
      </Button>

      {/* Modal de Cotações de Frete */}
      <Dialog open={cotacoesModal} onOpenChange={setCotacoesModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-red-600" />
              Cotações de Frete
            </DialogTitle>
            <DialogDescription>
              {distanciaFrete && <span>Distância: ~{distanciaFrete.toFixed(1)} km • </span>}
              {fonteFrete === 'Lalamove' ? 'Valores da Lalamove' : 'Valores estimados'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {cotacoes.map((cotacao) => (
              <Button
                key={cotacao.tipo}
                variant="outline"
                className="w-full justify-between h-14 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20"
                onClick={() => selecionarCotacao(cotacao)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    {getVeiculoIcon(cotacao.tipo)}
                  </div>
                  <span className="font-medium">{cotacao.nome}</span>
                </div>
                <span className="text-lg font-bold text-red-600">
                  R$ {cotacao.valor.toFixed(2)}
                </span>
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Clique para selecionar e preencher o custo real
          </p>
        </DialogContent>
      </Dialog>

      {/* Dialog de Sucesso */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Pedido Cadastrado!
            </DialogTitle>
            <DialogDescription>
              O pedido foi cadastrado com sucesso. O que você deseja fazer agora?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessDialog(false);
              }}
              className="flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Cadastrar Outro Pedido
            </Button>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                router.push('/kds');
              }}
              className="flex items-center gap-2"
            >
              <Monitor className="w-4 h-4" />
              Ir para o KDS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
