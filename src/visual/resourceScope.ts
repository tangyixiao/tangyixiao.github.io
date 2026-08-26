export interface ResourceScope {
  add(cleanup: () => void): void
  track<T>(resource: T, cleanup: (resource: T) => void): T
  cleanup(): void
}

export function createResourceScope(): ResourceScope {
  const cleanups: Array<() => void> = []
  let cleaned = false

  const add = (cleanup: () => void) => {
    if (cleaned) {
      cleanup()
      return
    }
    cleanups.push(cleanup)
  }

  const track = <T,>(resource: T, cleanup: (value: T) => void) => {
    add(() => cleanup(resource))
    return resource
  }

  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    let firstError: unknown
    for (let index = cleanups.length - 1; index >= 0; index -= 1) {
      try {
        cleanups[index]()
      } catch (error) {
        firstError ??= error
      }
    }
    cleanups.length = 0
    if (firstError) throw firstError
  }

  return { add, track, cleanup }
}
