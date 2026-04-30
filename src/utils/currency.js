let model = null
let isLoading = false

export async function loadCurrencyModel() {
  if (model) return model
  if (isLoading) return null

  try {
    isLoading = true
    const tmImage = await import('@teachablemachine/image')
    model = await tmImage.load('/currency-model/model.json', '/currency-model/metadata.json')
    console.log('Currency model loaded successfully')
    return model
  } catch (err) {
    console.warn(
      'Currency model not available (train it at teachablemachine.withgoogle.com):',
      err.message
    )
    return null
  } finally {
    isLoading = false
  }
}

export async function classifyCurrency(videoElement) {
  const loadedModel = await loadCurrencyModel()
  if (!loadedModel) return null

  try {
    const predictions = await loadedModel.predict(videoElement)
    const top = [...predictions].sort((a, b) => b.probability - a.probability)[0]

    if (top.probability > 0.85) {
      const names = {
        '10': 'ten',
        '20': 'twenty',
        '50': 'fifty',
        '100': 'one hundred',
        '200': 'two hundred',
        '500': 'five hundred',
      }

      const name = names[top.className] || top.className
      return `This is a ${name} rupee note.`
    }

    return null
  } catch (err) {
    console.warn('Currency classification error:', err.message)
    return null
  }
}
