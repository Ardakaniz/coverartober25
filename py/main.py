import numpy as np
from scipy.integrate import solve_ivp

# Parameters
g = 9.81
L1, L2 = 1.0, 10.0
m1, m2 = 10.0, 1.0
k = 500
N = 128
duration = 11
sample_count = 66

# theta1_init = np.array(
#     [[np.pi / 2 + d1 for d1 in np.linspace(-0.1, 0.1, N)] for _ in range(N)]
# )
theta1_init = np.array([[np.pi for _ in range(N)] for _ in range(N)])
theta2_init = np.array([[np.pi + d / N for _ in range(N)] for d in range(N)])
omega1_init = np.array([np.linspace(-np.pi / 5, np.pi / 5, N) for _ in range(N)])
omega2_init = np.zeros((N, N))

y0 = np.concatenate(
    [theta1_init.ravel(), theta2_init.ravel(), omega1_init.ravel(), omega2_init.ravel()]
)


def system(t, y):
    theta1 = y[: N * N].reshape(N, N)
    theta2 = y[N * N : 2 * N * N].reshape(N, N)
    omega1 = y[2 * N * N : 3 * N * N].reshape(N, N)
    omega2 = y[3 * N * N :].reshape(N, N)

    Δ = theta2 - theta1
    denom1 = (m1 + m2) * L1 - m2 * L1 * np.cos(Δ) ** 2
    denom2 = (L2 / L1) * denom1

    domega1 = (
        m2 * L1 * omega1**2 * np.sin(Δ) * np.cos(Δ)
        + m2 * g * np.sin(theta2) * np.cos(Δ)
        + m2 * L2 * omega2**2 * np.sin(Δ)
        - (m1 + m2) * g * np.sin(theta1)
    ) / denom1

    domega2 = (
        -m2 * L2 * omega2**2 * np.sin(Δ) * np.cos(Δ)
        + (m1 + m2)
        * (
            g * np.sin(theta1) * np.cos(Δ)
            - L1 * omega1**2 * np.sin(Δ)
            - g * np.sin(theta2)
        )
    ) / denom2

    domega1 += k * (
        np.roll(theta1, 1, axis=0)
        + np.roll(theta1, -1, axis=0)
        + np.roll(theta1, 1, axis=1)
        + np.roll(theta1, -1, axis=1)
        - 4 * theta1
    )
    domega2 += k * (
        np.roll(theta2, 1, axis=0)
        + np.roll(theta2, -1, axis=0)
        + np.roll(theta2, 1, axis=1)
        + np.roll(theta2, -1, axis=1)
        - 4 * theta2
    )

    return np.concatenate(
        [omega1.ravel(), omega2.ravel(), domega1.ravel(), domega2.ravel()]
    )


t_eval = np.linspace(0, duration, sample_count)

sol = solve_ivp(system, (0, duration), y0, t_eval=t_eval, method="DOP853")

pxs = (
    ((sol.y[: N * N, :] / (2.0 * np.pi)) + 0.5) % 1.0 * 255
)  # shape (N*N, len(t_eval))
pxs = pxs.reshape(N, N, -1)  # shape (N, N, len(t_eval))
pxs.astype(np.uint8).tofile("covers/tmp.bin")
