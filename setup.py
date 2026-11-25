from setuptools import find_packages, setup

with open("requirements.txt") as f:
    requirements = [line.strip() for line in f if line.strip() and not line.startswith("#")]

setup(
    name="medibot",
    version="2.0.0",
    author="Rahul Dev",
    description="RAG medical chatbot over The Gale Encyclopedia of Medicine, with OTP login and a disease library",
    packages=find_packages(exclude=["tests"]),
    include_package_data=True,
    install_requires=requirements,
    python_requires=">=3.10",
)
