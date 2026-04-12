import { useQuery } from '@tanstack/react-query'

interface IBGEMunicipio {
  id: number
  nome: string
}

export function useCidades(uf: string) {
  return useQuery({
    queryKey: ['cidades-ibge', uf],
    queryFn: async (): Promise<string[]> => {
      if (!uf) return []
      const res = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`
      )
      if (!res.ok) throw new Error('Erro ao buscar cidades')
      const data: IBGEMunicipio[] = await res.json()
      return data.map((m) => m.nome)
    },
    enabled: !!uf,
    staleTime: 1000 * 60 * 60 * 24, // cache 24h — cidades não mudam
  })
}
