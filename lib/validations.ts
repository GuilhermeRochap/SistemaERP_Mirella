// Validações de formulário

export function validarCPF(cpf: string): boolean {
  const cpfNumeros = cpf?.replace(/[^\d]/g, '') ?? '';
  
  if (cpfNumeros?.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpfNumeros)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfNumeros?.charAt?.(i) ?? '0') * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfNumeros?.charAt?.(9) ?? '0')) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfNumeros?.charAt?.(i) ?? '0') * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfNumeros?.charAt?.(10) ?? '0')) return false;
  
  return true;
}

export function formatarCPF(cpf: string): string {
  const numeros = cpf?.replace(/[^\d]/g, '') ?? '';
  return numeros?.replace?.(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') ?? '';
}

export function validarTelefone(telefone: string): boolean {
  const numeros = telefone?.replace(/[^\d]/g, '') ?? '';
  return numeros?.length === 10 || numeros?.length === 11;
}

export function formatarTelefone(telefone: string): string {
  const numeros = telefone?.replace(/[^\d]/g, '') ?? '';
  if (numeros?.length === 11) {
    return numeros?.replace?.(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') ?? '';
  } else if (numeros?.length === 10) {
    return numeros?.replace?.(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3') ?? '';
  }
  return telefone ?? '';
}

export function validarCEP(cep: string): boolean {
  const numeros = cep?.replace(/[^\d]/g, '') ?? '';
  return numeros?.length === 8;
}

export function formatarCEP(cep: string): string {
  const numeros = cep?.replace(/[^\d]/g, '') ?? '';
  return numeros?.replace?.(/(\d{5})(\d{3})/, '$1-$2') ?? '';
}

export async function buscarEnderecoPorCEP(cep: string): Promise<{
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
} | null> {
  try {
    const cepLimpo = cep?.replace(/[^\d]/g, '') ?? '';
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response?.json?.();
    
    if (data?.erro) return null;
    
    return {
      logradouro: data?.logradouro ?? '',
      bairro: data?.bairro ?? '',
      cidade: data?.localidade ?? '',
      estado: data?.uf ?? ''
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
}
