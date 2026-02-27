'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DadosMes {
  mes: string;
  mesFormatado: string;
  totalPagoCliente: number;
  totalCustoReal: number;
  diferenca: number;
  quantidade: number;
}

interface Relatorio {
  meses: DadosMes[];
  totalGeral: {
    totalPagoCliente: number;
    totalCustoReal: number;
    diferenca: number;
    quantidade: number;
  };
}

export default function RelatorioFretePage() {
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(true);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());

  const fetchRelatorio = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/frete/relatorio?ano=${anoSelecionado}`);
      const data = await response.json();
      setRelatorio(data);
    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelatorio();
  }, [anoSelecionado]);

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const maxValor = relatorio?.meses?.reduce((max, m) => 
    Math.max(max, m.totalPagoCliente, m.totalCustoReal), 0
  ) ?? 100;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-500">
          Relatório de Frete
        </h1>
        <p className="text-muted-foreground">
          Análise financeira do frete - Uso interno
        </p>
      </div>

      {/* Seletor de Ano */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setAnoSelecionado(anoSelecionado - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-red-500" />
          <span className="text-xl font-bold">{anoSelecionado}</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setAnoSelecionado(anoSelecionado + 1)}
          disabled={anoSelecionado >= new Date().getFullYear()}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando relatório...</p>
        </div>
      ) : relatorio ? (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Recebido dos Clientes</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatarValor(relatorio.totalGeral.totalPagoCliente)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pago às Transportadoras</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatarValor(relatorio.totalGeral.totalCustoReal)}
                    </p>
                  </div>
                  <Truck className="w-8 h-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className={relatorio.totalGeral.diferenca >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {relatorio.totalGeral.diferenca >= 0 ? 'Economia Total' : 'Prejuízo Total'}
                    </p>
                    <p className={`text-2xl font-bold ${relatorio.totalGeral.diferenca >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatarValor(Math.abs(relatorio.totalGeral.diferenca))}
                    </p>
                  </div>
                  {relatorio.totalGeral.diferenca >= 0 ? (
                    <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-500 opacity-50" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Entregas</p>
                    <p className="text-2xl font-bold">
                      {relatorio.totalGeral.quantidade}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-gray-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Barras Simples */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-red-500" />
                Comparativo Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {relatorio.meses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum dado de frete registrado para este ano.
                </p>
              ) : (
                <div className="space-y-4">
                  {relatorio.meses.map((mes) => (
                    <div key={mes.mes} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium w-20">{mes.mesFormatado}</span>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-blue-600">Cliente: {formatarValor(mes.totalPagoCliente)}</span>
                          <span className="text-orange-600">Custo: {formatarValor(mes.totalCustoReal)}</span>
                          <Badge 
                            variant="outline" 
                            className={mes.diferenca >= 0 
                              ? 'bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400'
                            }
                          >
                            {mes.diferenca >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                            {formatarValor(Math.abs(mes.diferenca))}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 h-6">
                        <div
                          className="bg-blue-500 rounded-l"
                          style={{ width: `${(mes.totalPagoCliente / maxValor) * 50}%` }}
                          title={`Cliente: ${formatarValor(mes.totalPagoCliente)}`}
                        />
                        <div
                          className="bg-orange-500 rounded-r"
                          style={{ width: `${(mes.totalCustoReal / maxValor) * 50}%` }}
                          title={`Custo: ${formatarValor(mes.totalCustoReal)}`}
                        />
                      </div>
                    </div>
                  ))}
                  
                  {/* Legenda */}
                  <div className="flex justify-center gap-6 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded" />
                      <span className="text-sm">Recebido do Cliente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-500 rounded" />
                      <span className="text-sm">Custo Real</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabela Detalhada */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Mês</th>
                      <th className="text-right py-3 px-2">Entregas</th>
                      <th className="text-right py-3 px-2">Recebido</th>
                      <th className="text-right py-3 px-2">Custo</th>
                      <th className="text-right py-3 px-2">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.meses.map((mes) => (
                      <tr key={mes.mes} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{mes.mesFormatado}</td>
                        <td className="text-right py-3 px-2">{mes.quantidade}</td>
                        <td className="text-right py-3 px-2 text-blue-600">{formatarValor(mes.totalPagoCliente)}</td>
                        <td className="text-right py-3 px-2 text-orange-600">{formatarValor(mes.totalCustoReal)}</td>
                        <td className={`text-right py-3 px-2 font-medium ${mes.diferenca >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {mes.diferenca >= 0 ? '+' : ''}{formatarValor(mes.diferenca)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 font-bold">
                      <td className="py-3 px-2">TOTAL</td>
                      <td className="text-right py-3 px-2">{relatorio.totalGeral.quantidade}</td>
                      <td className="text-right py-3 px-2 text-blue-600">{formatarValor(relatorio.totalGeral.totalPagoCliente)}</td>
                      <td className="text-right py-3 px-2 text-orange-600">{formatarValor(relatorio.totalGeral.totalCustoReal)}</td>
                      <td className={`text-right py-3 px-2 ${relatorio.totalGeral.diferenca >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {relatorio.totalGeral.diferenca >= 0 ? '+' : ''}{formatarValor(relatorio.totalGeral.diferenca)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum dado encontrado</p>
        </div>
      )}
    </div>
  );
}
